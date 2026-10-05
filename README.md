# Next.js MVP Template

A starting point for **one product, one deployable, one team**. It is Next.js on the server and in the browser. It has the tooling and documentation discipline of a larger platform, and none of its operational surface.

Fork it, or read the ADRs and ignore the code. Both are valid uses.

**The stance, in three lines:**

- **The menu is omakase.** The stack is decided in advance. You start at `build features`, not at `pick tools`.
- **Ship first, extract later.** One deployable until a force applies, and a seam that makes extraction a move, not a rewrite.
- **Small enough to read in full.** Every decision here fits in a short ADR set. A rule that needs a page of reasons belongs in a bigger template.

---

## Find your profile

This template ships one profile and documents three neighbours.

| Profile | You are here if | Style | Data | Deployables | Platform floor | What platform work looks like |
| --- | --- | --- | --- | --- | --- | --- |
| **`modular-monolith`**, **this repo** | No decomposition force applies. See the next section | Modular monolith | one database | 1 | whatever the provider runs for you | nobody's job. The provider operates it |
| `service-based` | Teams block each other on deploys, and a shared database is still acceptable | Service-based | services share a database | usually 3 to 8 | a few components, on managed foundations | part of a backend role |
| `microservices` | Services must change their data without coordination, so each service owns its data | Microservices | each service owns its data | often 15 or more | large, but still on managed foundations | a standing responsibility that a named person owns |
| `sovereign` | Self-hosting is *binding*, not preferred | Microservices | each service owns its data | often 15 or more | everything, and it is fixed for any service count | a primary responsibility, and it never rests on one person |

> **These are not maturity levels.** For most systems, a modular monolith is a correct *final* state. Higher rows are more expensive answers to pressures that you may not have.

**This repo implements `modular-monolith`.** For the `sovereign` row, use [sovereign-platform-template](https://github.com/tabmadi/sovereign-platform-template), with the same conventions at that scale. The two middle rows are positions, not presets to generate.

---

## What forces decomposition

The service count is an **outcome**, not a target. Each force alone justifies a boundary. **If no force applies, build a modular monolith.** That is why this repo exists.

| # | Force | Test |
| --- | --- | --- |
| 1 | Independent deploy cadence | Two parts must ship without a coordinated release |
| 2 | Number of teams | Teams block each other. This is Conway's law: it counts teams, not headcount and not features |
| 3 | Failure isolation | The failure of one part must not take another part down, as a *stated requirement* |
| 4 | Resource heterogeneity | Truly different scaling profiles: CPU, IO, or memory |
| 5 | Technology heterogeneity | A part must run on another runtime, such as ML in Python or chain code in Rust |
| 6 | Compliance boundary | Data residency or audit scope is cheaper to enforce by structure than by policy |

Count the forces that apply. Zero is the common answer, and this repo is built for it.

---

## The stack

| Layer | Choice | Why this one |
| --- | --- | --- |
| Framework | Next.js 16, App Router | One deployable serves the UI and the API. Server components remove the client-fetch layer |
| Runtime and package manager | Bun | One binary for install, test, and scripts |
| Styling | Tailwind 4 | No stylesheet architecture to invent |
| Data | Postgres through Drizzle | Types are generated from the schema, not asserted against it |
| Migrations | dbmate | Plain SQL, forward and back, with no framework coupling |
| Lint and format | Biome | One tool, one config, and no plugin resolution |
| Commits and hooks | cocogitto, lefthook | Conventional Commits, enforced at commit time |
| Tasks | mise | Pinned tools and one command surface |

---

## The seam

`src/server/domain/` holds pure functions: no React import, no database handle, and no `Request`. Route handlers and server actions parse input and call a service. The service runs the domain rules, then the repositories.

```text
src/app/                   pages, route handlers, server actions   transport
src/server/services/       one use case each                       orchestration
src/server/repositories/   database reads and writes               persistence
src/server/db/             schema and client                       persistence
src/server/domain/         business rules, pure                    the part that outlives this repo
```

`src/app/notes/` is a working example of every layer. Delete it when the first real feature exists.

This is the whole extraction plan. When a decomposition force applies, the domain layer moves to a service unchanged, and the route handlers become clients. Nothing else here ports: server actions and a Drizzle schema do not become a Go service. So the value is in the seam.

---

## Getting started

```bash
mise run setup                    # dependencies and git hooks
cp .env.example .env              # the URL of the local PostgreSQL
mise run db:up                    # local PostgreSQL in Docker
mise run db:migrate
mise run dev
```

`mise run check` is the gate: lint, test, and build. Run it before you finish a change.

---

## Documentation

Decisions live in [`docs/adr`](docs/adr) and rank above every other file, including [`AGENTS.md`](AGENTS.md). Start at [ADR-0000](docs/adr/0000-foundations.md).

[ADR-0001](docs/adr/0001-documentation-conventions.md) holds the rules for every text in the repo: Simple English, the banned constructs, and the comment rules.
