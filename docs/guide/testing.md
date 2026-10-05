# Run the tests locally

CI runs one command: `mise run ci`. This guide runs the same command on your machine, so a failure shows before the push.

## Set up once

1. Start Docker. The test database and the image build need it.
2. Run `mise run setup`. It installs the dependencies and the git hooks.
3. Copy the environment example: `cp .env.example .env`. It holds `TEST_DATABASE_URL`.

## What runs when

| When | Command | Checks | Time |
| --- | --- | --- | --- |
| Each commit | the `pre-commit` hook | Lint, types, and unit tests on the staged files | Seconds |
| Each push | the `pre-push` hook runs `mise run ci` | Everything that CI runs | About two minutes |
| By hand | `mise run ci` | Everything that CI runs | About two minutes |

`mise run ci` runs these steps in order:

1. `mise run install` installs the locked dependencies.
2. `mise run check:db` starts a fresh test PostgreSQL, applies the migrations, and runs the gate and the database tests.
3. `mise run docker:build` builds the production image.

If `mise run ci` passes on your machine, CI runs the same tasks on the same PostgreSQL version.

`mise run ci` removes the test PostgreSQL when it ends: on success, on failure, and on Ctrl+C. Every project from this template uses port 5433 for it. A database that stays up blocks the next run in another project.

## Skip the push check

Run `git push --no-verify` to push without the check. CI still runs it, per [ADR-0200](../adr/0200-delivery.md).

## Fix a failure

| Symptom | Cause | Fix |
| --- | --- | --- |
| Type errors after `git pull` name a missing module | The pull added a dependency | Run `mise run install` |
| `relation does not exist` in a database test | The test database lost its tables when it restarted | Run `mise run check:db`, which migrates first |
| The test database does not start | Another PostgreSQL uses port 5433, often the test database of another project | Run `mise run db:test:down` in that project, or stop the other PostgreSQL |
| `Cannot connect to the Docker daemon` | Docker is not running | Start Docker |
