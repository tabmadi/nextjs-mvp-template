# Run the tests locally

CI runs one command: `just ci`. This guide runs the same command on your machine, so a failure shows before the push.

## Set up once

1. Enter the dev shell: run `nix develop`, or allow direnv. It installs the git hooks.
2. Run `just setup`. It installs the locked dependencies.
3. Copy the environment example: `cp .env.example .env`. It holds `TEST_DATABASE_URL`.

## What runs when

| When | Command | Checks | Needs Docker |
| --- | --- | --- | --- |
| Each commit | the `pre-commit` hook | Biome, Markdown, data formats, Nix format, and secrets on the staged files | No |
| Each push | the `pre-push` hook runs `just ci` | Everything that CI runs | No |
| By hand, fast | `just check` | Lint, unit tests, and the build | No |
| By hand, database | `just db-test-up`, then `just test-db` | The database tests against the test PostgreSQL of `compose.yaml` | Yes |
| By hand, full | `just ci` | Everything that CI runs | No |

`just ci` runs `nix flake check`. Each check runs in the Nix sandbox, from the files that git tracks:

1. The linters, with Biome and the type check.
2. The unit tests.
3. The database tests, against a PostgreSQL that starts and stops inside the check.
4. The build of the app and of the image.

Nix keeps the result of each check. A second run repeats only the checks whose inputs changed.

If `just ci` passes on your machine, CI runs the same checks with the same tools.

## Skip the push check

Run `git push --no-verify` to push without the check. CI still runs it, per [ADR-0200](../adr/0200-delivery.md).

## Fix a failure

| Symptom | Cause | Fix |
| --- | --- | --- |
| Type errors after `git pull` name a missing module | The pull added a dependency | Run `just setup` |
| The `bun2nix` hook fails | `bun.nix` does not match `bun.lock` | Run `just bun-nix`, and commit `bun.nix` |
| A check passes locally but not in `just ci` | The check reads a file that git does not track | Run `git add` on the file |
| `relation does not exist` in `just test-db` | The test database lost its tables when it restarted | Run `just test-db` again. It migrates first |
| The test database does not start | Another PostgreSQL uses port 5433 | Run `just db-test-down` in that project, or stop the other PostgreSQL |
| `Cannot connect to the Docker daemon` | Docker is not running | Start Docker |
