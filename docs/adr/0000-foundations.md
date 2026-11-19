# ADR-0000: Foundations

- **Status:** Accepted
- **Decides:** The profile of this repo and its principles, the recipe contract, the shape and the comparisons of an ADR, and the license.

## Context

Forces decide an architecture style. The product category does not: two products in one category often need opposite structures. Three characteristics decide almost everything:

| Axis | Question | Range | This repo |
| --- | --- | --- | --- |
| A: Decomposition pressure | Must parts ship, scale, or fail independently | from monolith to many services | **none** |
| B: Operational sovereignty | Who is permitted to run it | from managed, through hybrid, to self-hosted | **managed**, or one owned machine in the self-hosted mode of [ADR-0201](0201-self-hosted-mode.md) |
| C: Correctness stakes | What a wrong answer costs | from cosmetic, through transactional, to regulated | transactional |

A project with no decomposition pressure and no sovereignty constraint pays nothing to run a platform: the provider operates it. Nobody is paged for a component that this repo does not run.

## Decision drivers

1. **No decomposition pressure.** No part must ship, scale, or fail apart from the rest.
2. **Managed.** A provider runs the machines, and nobody on the team is paged for them.
3. **Transactional.** A wrong answer costs money, so one database holds every transaction.
4. **One team.** One team owns the whole product.

## Considered options

### The profile

| Option | 1 No decomposition pressure | 2 Managed | 3 Transactional | 4 One team | Verdict |
| --- | --- | --- | --- | --- | --- |
| Microservices | Pays for a split that no force asks for | Many deployables to run | A transaction across services needs sagas | Built for many teams | Rejected on drivers 1 and 4 |
| A self-hosted platform on Kubernetes | Pays for a platform | No. The team runs it | Yes | A platform needs its own engineers | Rejected on driver 2 |
| Serverless functions | Yes | Yes | Each function opens its own connections and has its own limits | Yes | Rejected on driver 3 |
| **A modular monolith on a managed provider** | **Yes. One deployable** | **Yes** | **Yes. One database** | **Yes** | **Chosen. The seam keeps a later extraction a move, not a rewrite** |

### The shape of an ADR

| Option | 1 Checkable | 2 Greppable | 3 Small | 4 Replaceable | Verdict |
| --- | --- | --- | --- | --- | --- |
| Nygard: Context, Decision, Status, and Consequences | No section for rejected options | No rule list | Yes | One decision per record | Rejected. It records the outcome, not the comparison |
| MADR 4: drivers, considered options, and their pros and cons | Yes | No rule list | Optional parts grow it | One decision per record | Rejected as a whole. Its drivers and considered options are taken |
| Y-statements: one sentence per decision | Names one rejected option | No | Yes | Yes | Rejected. One sentence holds no comparison of several options |
| Design documents, such as RFCs | Yes | No | No | No | Rejected. A design document is a plan, and it goes stale after the change |
| **Nygard with MADR drivers and options, plus a `Rules` list** | **Yes** | **Yes** | **Optional sections stay out** | **Yes** | **Chosen** |

Sources:

- Nygard's format: [Documenting architecture decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
- MADR 4.0 with decision drivers and considered options: [adr.github.io/madr](https://adr.github.io/madr/).
- Y-statements and the other ADR templates: [adr.github.io/adr-templates](https://adr.github.io/adr-templates/).

### The license

| Option | Use in closed code | Patent grant | Copyleft | Verdict |
| --- | --- | --- | --- | --- |
| MIT | Yes | No express grant | No | Rejected. No patent grant |
| MPL-2.0 | Yes | Yes | On each changed file | Rejected. File copyleft adds a duty to every project that changes a file |
| GPL-3.0 or AGPL-3.0 | No | Yes | On the whole work | Rejected. A project of any license must be able to start here |
| **Apache-2.0** | **Yes** | **Yes** | **No** | **Chosen** |

Sources:

- The terms of each license: [choosealicense.com](https://choosealicense.com/licenses/).

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

**The recipe names are a contract.** The recipes `setup`, `format`, `lint`, `test`, `check`, and `ci` always exist, per [ADR-0103](0103-tasks.md). Their names do not change.

An ADR states what is true of this repo. It is law, not a plan: no roadmap, no follow-ups, and no remark on unfinished work.

**Every decision is an ADR, one decision per ADR.** An ADR states a rule as true now. A gap between an ADR and the code is a defect in the code.

**An ADR has a fixed shape.** It has a `Status` and a one-sentence `Decides` line. Its sections are `Context`, `Decision drivers`, `Considered options`, `Decision`, `Consequences`, and `Rules`. `_template.md` holds the shape.

**An ADR compares its options in a table.** Each column is a numbered decision driver, and the last column is the verdict. The chosen option is in bold. An ADR with no real alternative says so in one sentence instead of a table.

**A claim cites its source.** A list of sources follows each table, with a link to the page that states each claim. A claim without a source is reasoning, and the reader can weigh it as such.

**The `Rules` section is a flat list,** so a grep over all ADRs finds every convention.

**The number of an ADR names its topic.** A number has the same topic in every repo that uses the convention, so a reader moves between repos without a lookup.

| Numbers | Topic | Owner |
| --- | --- | --- |
| 0000 and 0001 | Foundations and documentation | Every repo |
| 0100 to 0109 | The shared toolchain: environment, source control and CI, dependency updates, tasks, formatters and linters, and the editor | Every repo, with the same number for the same topic |
| 0110 to 0199 | The toolchain of this repo only, such as the tools of its language | This repo |
| 0200 and up | Delivery, data, and the product | This repo |

**Inside this repo, an ADR links only to other ADRs and to its sources.** A README or a guide moves, and the ADR outlives it.

**The code is under the Apache License 2.0,** in `LICENSE`.

## Consequences

Everything scales to the limits of one process and one database, and those limits arrive without warning. The exit is the seam. The seam works only while `src/server/domain/` stays pure. One React import or one database handle in that directory turns a later extraction back into a rewrite.

An ADR is for the engineer who maintains the repo. The root `README.md` helps a reader choose the repo and start.

## Rules

- Business rules live in `src/server/domain/` and import neither React, nor a database client, nor a request type.
- A new deployable requires a decomposition force that the root `README.md` names and an ADR records.
- Every ADR has a `Status`, a one-sentence `Decides` line, and the sections of `_template.md`.
- One ADR settles one decision.
- An ADR of the shared toolchain has a number from 0100 to 0109. An ADR of the own toolchain of a repo starts at 0110.
- An ADR compares its options in a table with one column per decision driver, or says in one sentence why no alternative exists.
- A claim in a comparison links to its source, or it is reasoning.
- Inside this repo, an ADR links only to other ADRs and to its sources.
- The recipes `setup`, `format`, `lint`, `test`, `check`, and `ci` exist, and their names do not change.
- An ADR states what is true, never what is intended. No roadmap, follow-up, or status section.
- Accounts, API credentials, and balances stay portable to the final product. Everything else can be rebuilt.
- Inside this repo, an ADR links only to other ADRs.
- The recipes `setup`, `format`, `lint`, `test`, `check`, and `ci` exist, and their names do not change.
