# ADR-0200: Delivery

**Status:** Accepted
**Decides:** The deployable artifact, the local database, the CI gate, and how migrations reach production.

## Context

This profile is hosted by a provider, per [ADR-0000](0000-foundations.md). Providers differ in what they accept: a Git push, a build pack, or a container image. A project changes provider more often than it plans to, and the `sovereign` profile runs containers on its own cluster.

A real project also needs a local database, and a gate that runs on every push. A git hook is a gate only on the machine where it is installed.

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

### The CI gate

`.github/workflows/check.yml` runs on every push to `master` and on every pull request. It runs `mise run check` and builds the image. Every step calls a `mise` task, per [ADR-0100](0100-toolchain.md).

## Consequences

The image build needs a Docker daemon. A machine without one still runs `mise run check`, and CI builds the image.

The old and the new image both run against the migrated database for a short time. A migration that the old image cannot use causes errors in that window.

## Rules

- The deployable artifact is the image that `Dockerfile` builds. It runs the Next.js standalone output on Node.js as a non-root user.
- Runtime secrets come from the environment when the container starts, never during the image build.
- `GET /api/health/live` returns `200` while the process serves requests.
- A provider database URL uses `sslmode=verify-full`.
- Production migrations run as an explicit deployment step before the new image serves traffic, never at application startup.
- CI runs `mise run check` and the image build on every push to `master` and on every pull request. `(CI: check.yml)`
