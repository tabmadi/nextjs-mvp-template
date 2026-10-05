# ADR-0100: Toolchain

**Status:** Accepted
**Decides:** The pinned toolchain, the task surface, and what runs at commit time.

## Context

The value of a template is that its tool choices are made and reproducible. Two failures matter. The first is a tool that resolves from `$PATH`, at the version the machine has. The second is a check that only CI runs, which every local commit passes.

## Decision

`mise` pins every tool and is the only command surface. A command is `mise run <task>`. A bare `bun` or `biome` call resolves from `$PATH` at an unpinned version.

| Tool | Owns |
| --- | --- |
| bun | Install, test, and scripts |
| node | The Next.js runtime, in development, in the build, and in production |
| docker-cli, docker-compose | The production image and the local PostgreSQL |
| biome | Lint and format for TypeScript, JSON, and CSS |
| dbmate | Migrations |
| lefthook | Git hooks |
| cocogitto | Commit message shape |
| rumdl | Markdown style |
| gitleaks | Secret scanning |

Biome replaces ESLint and Prettier: one tool, one config file, and no plugin resolution graph.

`lefthook` runs the checks at commit time. A glob limits each check to the staged files it reads. A hook has no active mise shell, so each hook command runs its tool through `mise x` or a `mise` task. Commit messages follow Conventional Commits, and `cog` verifies them in the `commit-msg` hook.

`mise run check` is the gate: lint, test, and build.

## Consequences

The rule set of Biome is narrower than the rule set of ESLint. The `next` domain of Biome covers the Next-specific rules of `eslint-config-next`, but not one for one.

Next.js generates route types into `.next/types`. So `tsc --noEmit` fails on a clean checkout until `next typegen` runs. `lint:ts` runs it first.

## Rules

- Every tool is pinned in `.mise.toml`. No tool is resolved from `$PATH`.
- Every command is a `mise` task. A CI workflow step calls a task, never a tool directly.
- Commit messages follow Conventional Commits with the type set in `cog.toml`. `(ref: Conventional Commits 1.0.0)`
- `mise run check` passes before a change is finished.
- A git hook runs every tool through `mise x` or a `mise` task, never from `$PATH`.
