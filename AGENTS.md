# Agent guide

Tool-agnostic guide for any coding agent (Codex, Cursor, Claude Code, or another) working in this repo. `AGENTS.md` is the one standard: an agent either reads it or it does not — the repo carries no per-tool shim files (`CLAUDE.md`, `.cursor/rules/`, etc.). A tool that ignores `AGENTS.md` is a limitation of that tool, not something the repo works around.

## The one rule that outranks this file

**Humans are the first developers. ADRs and `docs/` outrank this file.** The canonical home for any decision, convention, or rationale is an [ADR](docs/adr) or a `docs/` file — human-first, tool-neutral, reviewed.

This file holds only agent-specific operational hints: how to navigate, build, and run the repo, and what to read first.

## Read first

- [ADR-0000](docs/adr/0000-foundations.md) — the thesis, the profile this repo implements, and the ADR process. Read it before anything else.
- [docs/adr/README.md](docs/adr/README.md) — the ADR index, one line each.

## Load these first, by task

| Changing | Load | Then check |
| --- | --- | --- |
| A route, page, or component | [0400](docs/adr/0400-frontend.md) | `mise run lint:ts` |
| Business logic | [0300](docs/adr/0300-data-and-domain.md) — the `src/server/domain` rule is the load-bearing one | `mise run test` |
| The schema or a migration | [0300](docs/adr/0300-data-and-domain.md) | `mise run db:migrate`, `mise run test` |
| A document or an ADR | [0001](docs/adr/0001-documentation-conventions.md), and `_template.md` for a new ADR | `mise run lint:md` |

## How the docs are organised

- **`Rules`** at the bottom of each ADR are normative and greppable. A rule that a mechanism enforces names it: `(CI: <task>)` = a linter or workflow, `(ref: <standard>)` = an adopted external standard. An unannotated rule is equally normative, and has no gate to point at. To check a convention, grep the Rules sections first; read the full ADR only when you need the rationale.
- **House style** for prose, logging, and code comments is [ADR-0001](docs/adr/0001-documentation-conventions.md). It adopts ISO 24495-1 plain language and Google developer-docs voice, and makes only the deltas normative. Its banned-constructs table governs every doc and every comment you write: no chronology, no intensifiers, no hedges, no meta-commentary.
- **Genre decides the path**: `docs/adr/` decisions, `docs/guide/` procedures, `docs/reference/` lookups.
- **An ADR is law, not a plan.** It states what is true of this repo, never what someone intends to do about it. Do not add a `Follow-ups` section, a roadmap, or a remark that something is `not yet wired` — a gap between an ADR and the repo is unfinished work, not an unfinished decision.
- **Planned work goes in a local `*.local.md` file**, which `.gitignore` excludes and nothing committed links to. Never create a committed roadmap, backlog, or status file to replace it. A `*.local.md` file and its content are private to the engineer who wrote them: never cite, quote, or reference them in a commit, a doc, a PR description, or any other output.

## Working in the repo

- The task runner is `mise` (root `.mise.toml`); commands are `mise run <task>`. `mise run setup` installs dependencies and the git hooks.
- Tools are pinned and installed by `mise`; a shell with mise inactive resolves a bare tool call (`bun`, `biome`, `dbmate`, …) from `PATH`, at an unpinned version. `mise run <task>` activates the toolchain for that task's duration, a bare tool call does not.
- **The domain seam is the one structural rule.** `src/server/domain/` holds pure functions: no React import, no database handle, no `Request`. Route handlers and server actions do transport and persistence, then call into it. This is what makes a later extraction into a separate service a move rather than a rewrite.
- Next.js generates route types into `.next/types`. `tsc --noEmit` fails on a clean checkout until `next typegen` has run once; `mise run lint:ts` does this for you.
- Before finishing a change, run `mise run check` to lint, test, and build; `mise run test` / `lint` / `format` run each individually.
