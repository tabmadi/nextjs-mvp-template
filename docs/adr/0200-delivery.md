# ADR-0200: Delivery

- **Status:** Accepted
- **Decides:** The deployable artifact, the local tiers, the CI gate, and how migrations reach production.

## Context

This profile is hosted by a provider, per [ADR-0000](0000-foundations.md). Providers differ in what they accept: a Git push, a build pack, or a container image. A product changes provider more often than it plans to, and a self-hosted platform runs containers on its own cluster.

Daily work also needs a local database, and a way to run the production artifact before a deploy.

An MVP trades many things for speed, and CI looks like one of them. The evidence says the opposite. The [DORA research](https://dora.dev/capabilities/continuous-integration/) finds that continuous integration gives higher deployment frequency and more stable systems together. Speed and stability are not a trade.

CI has two costs that slow a team:

- **Waiting.** A slow run that blocks a merge makes every change wait. DORA puts the limit for automated tests at about ten minutes.
- **Breakage from the environment.** A run fails for a reason outside the code, and someone repairs the pipeline, not the product. [Studies of CI projects](https://arxiv.org/pdf/2102.06666) report this cost and long runs as its main problems.

A git hook is a gate only on the machine where it is installed. A check that runs only in CI fails after the push, when the author has moved on. A change that passes locally and fails in CI costs a second round trip.

## Decision drivers

1. **Any provider.** The artifact runs on every provider that runs a container, so a change of provider changes no build.
2. **Same build everywhere.** The artifact builds the same way on a laptop and in CI, from the locked inputs.
3. **No daemon in CI.** The checks need no Docker daemon, per [ADR-0101](0101-source-control-and-ci.md).
4. **Safe migrations.** A schema change never races between two instances that start together.

## Considered options

### The artifact

| Option | 1 Any provider | 2 Same build | 3 No daemon | Verdict |
| --- | --- | --- | --- | --- |
| The build of one provider, such as a Git push to Vercel | No. The build lives at the provider | No | Yes | Rejected on drivers 1 and 2 |
| Cloud Native Buildpacks | Yes | The builder image decides the tools | Needs Docker | Rejected on drivers 2 and 3 |
| A `Dockerfile` | Yes | Only when every base image is pinned by digest | Needs Docker | Rejected on driver 3. It stays the fallback for a provider that builds from source |
| **An image that Nix builds with `dockerTools`** | **Yes. It is a plain OCI image** | **Yes. `flake.lock` pins every input** | **Yes** | **Chosen** |

Sources:

- [dockerTools in the nixpkgs manual](https://nixos.org/manual/nixpkgs/stable/#sec-pkgs-dockerTools), [Cloud Native Buildpacks](https://buildpacks.io/).

### When migrations run

| Option | 4 Safe migrations | Verdict |
| --- | --- | --- |
| At application startup | No. Two instances that start together race on the same migration | Rejected |
| **An explicit step before the new image serves traffic** | **Yes. One run, and it fails before the deploy** | **Chosen** |

## Decision

### The artifact

The deployable artifact is the container image that Nix builds as `packages.image` in `flake.nix`:

1. bun2nix installs the locked dependencies of `bun.lock`.
2. Node.js builds Next.js with standalone output.
3. The image runs `server.js` on Node.js as a user without privileges.

Every provider that runs a container runs this image, so a change of provider changes no build. The image holds no environment file and no key. Runtime configuration, such as `DATABASE_URL`, comes from the environment when the container starts.

`GET /api/health/live` answers `200` while the process serves requests. The image health check calls it.

### The local tiers

The `local` environment has two tiers, per the shared terms of [ADR-0001](0001-documentation-conventions.md):

| Tier | Recipes | Runs |
| --- | --- | --- |
| Inner loop | `just db-up`, then `just dev` | `next dev` on the machine, against the PostgreSQL of `compose.yaml` |
| Full tier | `just image-up` | The production image, against the same PostgreSQL |

`.env.example` holds the local database URL.

### The database connection

TLS settings live in `DATABASE_URL`, which both `pg` and `dbmate` read. A provider database uses `sslmode=verify-full`. A provider CA certificate is a file that `sslrootcert` names. The local database uses `sslmode=disable`.

### Migrations

A migration runs as an explicit deployment step: `just db-migrate` with the `DATABASE_URL` of the target. It runs before the new image serves traffic. The application never migrates at startup, because two instances that start together race on the same migration.

### The CI policy

CI keeps the benefit and removes both costs:

| Concern | Policy | Why |
| --- | --- | --- |
| What it runs | `just ci`, which is `nix flake check`: every lint, the tests, the database tests against a PostgreSQL inside the check, the build, and the image | One command, so a laptop and CI cannot drift apart |
| Before a push | The `pre-push` hook runs `just ci`. `git push --no-verify` skips it | A failure shows before the push, not after it |
| When | Every push to `master` and every pull request | Every change gets feedback |
| Blocking | Advisory. CI is not a required status check | Nobody waits for it. A red run is information |
| A red run | Fixed or reverted first, before other work | A build that stays red stops being read, per DORA |
| Speed | One job, under ten minutes | The DORA limit for feedback |
| Moving parts | The workflow has one step after setup, `just ci`, per [ADR-0101](0101-source-control-and-ci.md). The checks need no Docker | The pipeline and a laptop run the same commands |
| Deployment | No CD. A deployment is the deploy step of the provider, or a manual step | A deploy pipeline is a second system to keep working |

`.github/workflows/check.yml` implements the policy.

## Consequences

Nix builds the image without a Docker daemon. Docker is needed only for the local PostgreSQL and to run the image locally.

The old and the new image both run against the migrated database for a short time. A migration that the old image cannot use causes errors in that window.

## Rules

- The deployable artifact is the image of `packages.image` in `flake.nix`. It runs the Next.js standalone output on Node.js as a user without privileges.
- Runtime secrets come from the environment when the container starts, never during the image build.
- `GET /api/health/live` returns `200` while the process serves requests.
- A provider database URL uses `sslmode=verify-full`.
- Production migrations run as an explicit deployment step before the new image serves traffic, never at application startup.
- CI runs `just ci` on every push to `master` and on every pull request. The workflow has no other step after setup. `(CI: ci; ref: DORA)`
- The `pre-push` hook runs `just ci`.
- CI is advisory: it is not a required status check. A red run on `master` is fixed or reverted before other work. `(ref: DORA)`
- A CI run finishes in under ten minutes. A slower step is made faster or removed. `(ref: DORA)`
- The database tests in CI run against a PostgreSQL inside the check, never against a shared database.
- No workflow deploys. A deployment uses the deploy step of the provider, or runs by hand.
