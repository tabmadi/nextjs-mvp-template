# ADR-0000: Foundations

**Status:** Accepted
**Decides:** The profile this repo implements, the principles that follow from it, and the ADR process itself.

## Context

Architecture style is chosen against forces, not against product category. Two products in one category routinely need opposite structures. Three characteristics determine nearly everything:

| Axis | Question | Range | This repo |
| --- | --- | --- | --- |
| A — Decomposition pressure | Must parts ship, scale, or fail independently? | monolith → many services | **none** |
| B — Operational sovereignty | Who is permitted to run it? | managed → hybrid → self-hosted | **managed** |
| C — Correctness stakes | What does a wrong answer cost? | cosmetic → transactional → regulated | transactional |

A project with no decomposition pressure and no sovereignty constraint pays nothing for a platform floor: the provider operates it. Every component this repo does not run is a component nobody has to page for.

## Decision

This repo implements the `modular-monolith` profile: one deployable, one database, one team, hosted by a provider.

Four principles follow.

**The menu is omakase.** The stack is pre-decided and pinned. A generated project starts at "build features," not "pick tools." Deviating is allowed; it has to be deliberate and recorded here.

**Ship first, extract later.** Decomposition happens when a force applies, never in anticipation of one. A modular monolith is a correct terminal state, not a waypoint.

**One seam, held strictly.** Business rules live in `src/server/domain/` as pure functions. That layer is the only part of this repo that survives extraction into a separate service, so it is the only boundary worth enforcing before a force demands one.

**Enforced by machines.** A convention with no gate is a suggestion. Rules carry `(CI: <task>)` when a task enforces them.

An ADR states what is true of this repo. It is law, not a plan: no roadmap, no follow-ups, no note that something is unfinished. A gap between an ADR and the code is unfinished work.

## Consequences

Everything scales to the limits of one process and one database, and those limits arrive without warning. The exit is the seam, and the seam only works if `src/server/domain/` stays pure — a single React import or database handle in that directory converts a later extraction back into a rewrite.

The ADR set is inherited wholesale by every project generated from this repo, so an ADR is written for the engineer maintaining the project, not for someone deciding whether to adopt it. Selection guidance belongs in the root `README.md`, which a generated project rewrites.

## Rules

- Business rules live in `src/server/domain/` and import neither React, nor a database client, nor a request type.
- A new deployable requires a decomposition force named in the root `README.md` and recorded in an ADR.
- Every ADR carries a `Status`, a one-sentence `Decides` line, and a flat `Rules` section.
- An ADR states what is true, never what is intended. No roadmap, follow-up, or status section.
- Planned work lives in an untracked `*.local.md` file. No committed roadmap, backlog, or status file.
