# ADR-0100: Toolchain

**Status:** Accepted
**Decides:** The pinned toolchain, the task surface, and what runs at commit time.

## Context

A template's value is that the tool choices are already made and reproducible. Two failure modes matter: a tool resolved from `$PATH` at whatever version the machine happens to carry, and a check that exists only in CI, which every local commit slips past.

## Decision

`mise` pins every tool and provides the only command surface. Commands are `mise run <task>`; a bare `bun` or `biome` call resolves from `$PATH` at an unpinned version.

| Tool | Owns |
| --- | --- |
| bun | Install, test, script running |
| biome | Lint and format for TypeScript, JSON, and CSS |
| dbmate | Migrations |
| lefthook | Git hooks |
| cocogitto | Commit message shape |
| rumdl | Markdown style |
| gitleaks | Secret scanning |

Biome replaces ESLint and Prettier. One tool, one config file, no plugin resolution graph.

`lefthook` mirrors `mise run pre-commit`, glob-gated so each check runs only when a file it cares about is staged. Commit messages follow Conventional Commits, verified by `cog` in the `commit-msg` hook.

`mise run check` is the gate: lint, test, build.

## Consequences

Biome's rule set is narrower than ESLint's, and the Next-specific rules that `eslint-config-next` provides are covered by Biome's `next` domain rather than matched one for one.

Next.js generates route types into `.next/types`, so `tsc --noEmit` fails on a clean checkout until `next typegen` has run. `lint:ts` runs it first.

## Rules

- Every tool is pinned in `.mise.toml`. No tool is resolved from `$PATH`.
- Every command is a `mise` task. A CI workflow step calls a task, never a tool directly.
- Commit messages follow Conventional Commits with the type set in `cog.toml`. `(CI: lint:ts)` `(ref: Conventional Commits 1.0.0)`
- `mise run check` passes before a change is finished.
