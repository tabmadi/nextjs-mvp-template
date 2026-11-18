# ADR-0000: Foundations

- **Status:** Accepted
- **Decides:** The profile this repo implements, the principles that follow from it, the recipe contract, and the ADR process itself.

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

Five principles follow.

**The menu is omakase.** The stack is decided in advance and pinned. Work starts at `build features`, not at `pick tools`. A deviation is allowed. It is deliberate, and an ADR records it.

**Ship first, extract later.** Decomposition happens when a force applies, never before one applies. A modular monolith is a correct final state, not a step toward microservices.

**One seam, held strictly.** The seam is `src/server/domain/`, which holds the business rules as pure functions. Only that layer survives an extraction into a separate service. So it is the only boundary that this repo enforces before a force applies.

**Real users carry three things forward.** An MVP has real users. When the product outgrows it, for example by a move to a self-hosted platform, three things move with the users:

| What moves | Why it cannot be rebuilt | The rule that keeps it portable |
| --- | --- | --- |
| Accounts | A forced new registration loses users | Password hashes are Argon2id PHC strings, per [ADR-0304](0304-identity-and-authorization.md) |
| API credentials | A customer stores them in code and systems that this repo does not deploy | A credential is stored only as a hash of the full secret, per [ADR-0304](0304-identity-and-authorization.md) |
| Balances | A prepaid balance is a debt to the customer | Money is an exact decimal, per [ADR-0300](0300-data-and-domain.md) |

Everything else can be rebuilt: identifiers, API shapes, history, and the infrastructure.

**Machines enforce it.** A convention with no gate is a suggestion. A Rule carries `(CI: <task>)` when a task enforces it.

**The recipe names are a contract.** The recipes `setup`, `format`, `lint`, `test`, `check`, and `ci` always exist, per [ADR-0100](0100-toolchain.md). Their names do not change.

An ADR states what is true of this repo. It is law, not a plan: no roadmap, no follow-ups, and no remark on unfinished work. A gap between an ADR and the code is a defect in the code.

**Inside this repo, an ADR links only to other ADRs.** A README or a guide moves, and the ADR outlives it. A link to a published standard is allowed.

## Consequences

Everything scales to the limits of one process and one database, and those limits arrive without warning. The exit is the seam. The seam works only while `src/server/domain/` stays pure. One React import or one database handle in that directory turns a later extraction back into a rewrite.

An ADR is for the engineer who maintains the repo. The root `README.md` helps a reader choose the repo and start.

## Rules

- Business rules live in `src/server/domain/` and import neither React, nor a database client, nor a request type.
- A new deployable requires a decomposition force that the root `README.md` names and an ADR records.
- Every ADR carries a `Status`, a one-sentence `Decides` line, and a flat `Rules` section.
- An ADR states what is true, never what is intended. No roadmap, follow-up, or status section.
- Accounts, API credentials, and balances stay portable to the final product. Everything else can be rebuilt.
- Inside this repo, an ADR links only to other ADRs.
- The recipes `setup`, `format`, `lint`, `test`, `check`, and `ci` exist, and their names do not change.
