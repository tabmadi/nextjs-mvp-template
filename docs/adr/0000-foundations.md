# ADR-0000: Foundations

**Status:** Accepted
**Decides:** The profile this repo implements, the principles that follow from it, and the ADR process itself.

## Context

Forces decide an architecture style. The product category does not: two products in one category often need opposite structures. Three characteristics decide almost everything:

| Axis | Question | Range | This repo |
| --- | --- | --- | --- |
| A: Decomposition pressure | Must parts ship, scale, or fail independently | from monolith to many services | **none** |
| B: Operational sovereignty | Who is permitted to run it | from managed, through hybrid, to self-hosted | **managed** |
| C: Correctness stakes | What a wrong answer costs | from cosmetic, through transactional, to regulated | transactional |

A project with no decomposition pressure and no sovereignty constraint pays nothing to run a platform: the provider operates it. Nobody is paged for a component that this repo does not run.

## Decision

This repo implements the `modular-monolith` profile: one deployable, one database, and one team, hosted by a provider.

Four principles follow.

**The menu is omakase.** The stack is decided in advance and pinned. A generated project starts at `build features`, not at `pick tools`. A deviation is allowed. It is deliberate, and an ADR records it.

**Ship first, extract later.** Decomposition happens when a force applies, never before one applies. A modular monolith is a correct final state, not a step toward microservices.

**One seam, held strictly.** The seam is `src/server/domain/`, which holds the business rules as pure functions. Only that layer survives an extraction into a separate service. So it is the only boundary that this repo enforces before a force applies.

**Machines enforce it.** A convention with no gate is a suggestion. A Rule carries `(CI: <task>)` when a task enforces it.

An ADR states what is true of this repo. It is law, not a plan: no roadmap, no follow-ups, and no remark on unfinished work. A gap between an ADR and the code is unfinished work.

## Consequences

Everything scales to the limits of one process and one database, and those limits arrive without warning. The exit is the seam. The seam works only while `src/server/domain/` stays pure. One React import or one database handle in that directory turns a later extraction back into a rewrite.

Every project generated from this repo inherits the whole ADR set. So an ADR is written for the engineer who maintains the project, not for a person who decides whether to adopt it. Selection guidance belongs in the root `README.md`, which a generated project rewrites.

## Rules

- Business rules live in `src/server/domain/` and import neither React, nor a database client, nor a request type.
- A new deployable requires a decomposition force that the root `README.md` names and an ADR records.
- Every ADR carries a `Status`, a one-sentence `Decides` line, and a flat `Rules` section.
- An ADR states what is true, never what is intended. No roadmap, follow-up, or status section.
- Planned work lives in an untracked `*.local.md` file. No committed roadmap, backlog, or status file.
