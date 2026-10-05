# Agent guide

This guide is for any coding agent that works in this repo: Codex, Cursor, Claude Code, or another. `AGENTS.md` is the one standard. The repo has no per-tool files such as `CLAUDE.md` or `.cursor/rules/`. A tool that ignores `AGENTS.md` has a limitation, and the repo does not work around it.

## The one rule above this file

**Humans are the first developers. ADRs and `docs/` rank above this file.** Every decision, convention, or rationale lives in an [ADR](docs/adr) or a `docs/` file. Those files are for humans first, are neutral to tools, and are reviewed.

This file holds only operational hints for agents: how to navigate, build, and run the repo, and what to read first.

## Write in Simple English

Every text you write in this repo follows the Simple English profile in [ADR-0001](docs/adr/0001-documentation-conventions.md#simple-english). This covers docs, ADRs, code comments, commit titles, task descriptions, error messages, and UI copy.

- Use common words at CEFR B1. Technical names and technical verbs are always allowed. Keep one term for one concept.
- Write one idea per sentence. A sentence has at most 25 words, or 20 words in `docs/guide/` and numbered steps.
- Use only these punctuation marks in prose: period, comma, colon, and the possessive apostrophe.
- Do not use an em dash, en dash, semicolon, parentheses, `?`, `!`, ellipsis, quote marks, `&`, or `/` for `or`. Use backticks for literal text.
- Do not use `e.g.`, `i.e.`, `etc.`, or contractions such as `don't`.
- Write a citation into the sentence: `..., per [ADR-0300](docs/adr/0300-data-and-domain.md).` Do not put it in parentheses.

No task checks these rules. Read your text against the profile before you finish.

## Read first

- [ADR-0000](docs/adr/0000-foundations.md): the thesis, the profile this repo implements, and the ADR process. Read it before anything else.
- [docs/adr/README.md](docs/adr/README.md): the ADR index, one line for each ADR.

## What to load first, by task

| Changing | Load | Then check |
| --- | --- | --- |
| A route, page, or component | [0400](docs/adr/0400-frontend.md) | `mise run lint:ts` |
| Business logic | [0300](docs/adr/0300-data-and-domain.md). The `src/server/domain` rule is the load-bearing one | `mise run test` |
| The schema, a migration, a repository, or a service | [0300](docs/adr/0300-data-and-domain.md) | `mise run db:migrate`, `mise run test:db` |
| Any user-facing copy | the Simple English profile in [0001](docs/adr/0001-documentation-conventions.md#simple-english) | `mise run lint:ts` |
| A document, an ADR, or a comment | [0001](docs/adr/0001-documentation-conventions.md) with its Simple English profile, and `_template.md` for a new ADR | `mise run lint:md` |

## How the docs are organised

- **`Rules`** at the end of each ADR are normative and greppable. A rule that a mechanism enforces names it:
  - `(CI: <task>)` is a linter or workflow.
  - `(ref: <standard>)` is an adopted external standard.

  A rule with no annotation binds in the same way, but no gate checks it. To check a convention, grep the Rules sections first. Read the full ADR only when you need the reason for a rule.
- **House style** for prose, UI copy, and code comments is [ADR-0001](docs/adr/0001-documentation-conventions.md). Its Simple English profile follows ASD-STE100. It also adopts ISO 24495-1 plain language and the Google developer-docs voice. Only the local deltas are normative.
  - Its **banned-constructs table** governs every doc and comment you write: no chronology, no intensifiers, no hedges, no meta-commentary.
  - Three or more items that share two or more attributes are a table.
  - Its **three comment tests** decide whether a comment exists at all. The deletion test: keep a comment only if its absence would cause a wrong change, and doubt resolves to deletion. The genre test: a sentence that is still true without the file belongs in an ADR or a doc, and the comment cites it. The length test: one paragraph of at most three lines, and one line is the norm.
  - The reader is an expert with an LLM at hand, so nothing that the code shows is written down.
- **Genre decides the path.** `docs/adr/` holds decisions, `docs/guide/` holds procedures, `docs/reference/` holds lookups, and `docs/product/` holds the product: who it serves, what it sells, and why.
- **An ADR is law, not a plan.** It states what is true of this repo, never what someone intends to do. Do not add a `Follow-ups` section, a roadmap, or a remark such as `not yet wired`. A gap between an ADR and the repo is unfinished work, not an unfinished decision.
- **Planned work goes in a local `*.local.md` file.** `.gitignore` excludes these files, and nothing committed links to them.
  - Never create a committed roadmap, backlog, or status file to replace it.
  - A `*.local.md` file and its content are private to the engineer who wrote it. Never cite, quote, or reference one in a commit, a doc, a PR description, or any other output.

## Working in the repo

- The task runner is `mise`, configured in the root `.mise.toml`. Run a task with `mise run <task>`. `mise run setup` installs the dependencies and the git hooks.
- `mise` pins and installs the tools. In a shell where mise is not active, a bare tool call such as `bun`, `biome`, or `dbmate` comes from `PATH`, at an unpinned version. `mise run <task>` activates the toolchain for that task only. A bare tool call does not.
- **The domain seam is the one structural rule.** `src/server/domain/` holds pure functions: no React import, no database handle, and no `Request`. Route handlers and server actions do transport and persistence, then call into it. So a later extraction into a separate service is a move, not a rewrite.
- Next.js generates route types into `.next/types`. `tsc --noEmit` fails on a clean checkout until `next typegen` runs once. `mise run lint:ts` runs it for you.
- Before you finish a change, run `mise run check` to lint, test, and build. `mise run test`, `lint`, and `format` run each step alone.
- Before you push, run `mise run ci`. It runs exactly what CI runs, and the `pre-push` hook runs it too. [docs/guide/testing.md](docs/guide/testing.md) lists the fixes for common failures.
