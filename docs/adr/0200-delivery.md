# ADR-0200: Delivery

**Status:** Accepted
**Decides:** The deployable artifact, the local database, the CI gate, and how migrations reach production.

## Context

This profile is hosted by a provider, per [ADR-0000](0000-foundations.md). Providers differ in what they accept: a Git push, a build pack, or a container image. A project changes provider more often than it plans to, and the `sovereign` profile runs containers on its own cluster.

A real project also needs a local database.

An MVP trades many things for speed, and CI looks like one of them. The evidence says the opposite. The [DORA research](https://dora.dev/capabilities/continuous-integration/) finds that continuous integration gives higher deployment frequency and more stable systems together. Speed and stability are not a trade.

CI has two costs that slow a team:

- **Waiting.** A slow run that blocks a merge makes every change wait. DORA puts the limit for automated tests at about ten minutes.
- **Breakage from the environment.** A run fails for a reason outside the code, and someone repairs the pipeline, not the product. [Studies of CI in practice](https://arxiv.org/pdf/2102.06666) report this cost and long runs as its main problems.

A git hook is a gate only on the machine where it is installed. A check that runs only in CI fails after the push, when the author has moved on. A change that passes locally and fails in CI costs a second round trip.

## Decision

### The artifact

The deployable artifact is the container image that `Dockerfile` builds:

1. Bun installs the locked dependencies.
2. Node.js builds Next.js with standalone output.
3. The runtime image runs `server.js` on Node.js as the `node` user.

Every provider that runs a container runs this image, so a change of provider changes no build. The build context excludes environment files and keys. Runtime configuration, such as `DATABASE_URL`, comes from the environment when the container starts.

`GET /api/health/live` answers `200` while the process serves requests. The image health check calls it.

### The local database

`compose.yaml` runs PostgreSQL for development. `mise run db:up` starts it, and `.env.example` holds its URL. `mise run docker:up` runs the production image against it.

### The database connection

TLS settings live in `DATABASE_URL`, which both `pg` and `dbmate` read. A provider database uses `sslmode=verify-full`. A provider CA certificate is a file that `sslrootcert` names. The local database uses `sslmode=disable`.

### Migrations

A migration runs as an explicit deployment step: `mise run db:migrate` with the `DATABASE_URL` of the target. It runs before the new image serves traffic. The application never migrates at startup, because two instances that start together race on the same migration.

### The CI policy

CI keeps the benefit and removes both costs:

| Concern | Policy | Why |
| --- | --- | --- |
| What it runs | `mise run ci`: the install, the gate, the database tests, and the image build | One command, so a laptop and CI cannot drift apart |
| Before a push | The `pre-push` hook runs `mise run ci`. `git push --no-verify` skips it | A failure shows before the push, not after it |
| When | Every push to `master` and every pull request | Every change gets feedback |
| Blocking | Advisory. CI is not a required status check | Nobody waits for it. A red run is information |
| A red run | Fixed or reverted first, before other work | A build that stays red stops being read, per DORA |
| Speed | One job, under ten minutes | The DORA limit for feedback |
| Moving parts | Every step calls a `mise` task, per [ADR-0100](0100-toolchain.md). Docker comes from the host | The pipeline and a laptop run the same commands |
| Deployment | No CD. A deployment is the deploy step of the provider, or a manual step | A deploy pipeline is a second system to keep working |

`.github/workflows/check.yml` implements the policy.

## Consequences

The image build needs a Docker daemon. A machine without one still runs `mise run check`, and CI builds the image.

The old and the new image both run against the migrated database for a short time. A migration that the old image cannot use causes errors in that window.

## Rules

- The deployable artifact is the image that `Dockerfile` builds. It runs the Next.js standalone output on Node.js as a non-root user.
- Runtime secrets come from the environment when the container starts, never during the image build.
- `GET /api/health/live` returns `200` while the process serves requests.
- A provider database URL uses `sslmode=verify-full`.
- Production migrations run as an explicit deployment step before the new image serves traffic, never at application startup.
- CI runs `mise run ci` on every push to `master` and on every pull request. The workflow has no other step. `(CI: check.yml; ref: DORA)`
- The `pre-push` hook runs `mise run ci`.
- CI is advisory: it is not a required status check. A red run on `master` is fixed or reverted before other work. `(ref: DORA)`
- A CI run finishes in under ten minutes. A slower step is made faster or removed. `(ref: DORA)`
- Every CI step calls a `mise` task.
- No workflow deploys. A deployment uses the deploy step of the provider, or runs by hand.
