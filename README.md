# Next.js MVP Template

A starting point for **one product, one deployable, one team** — Next.js on both sides of the wire, with the tooling and documentation discipline of a much larger platform and none of its operational surface.

Fork it, or read the ADRs and ignore the code. Both are valid uses.

**The stance, in three lines:**

- **The menu is omakase.** The stack is pre-decided. You start at "build features," not "pick tools."
- **Ship first, extract later.** One deployable until a force says otherwise, and a seam that makes extraction a move rather than a rewrite.
- **Small enough to hold in your head.** Every decision here fits in a short ADR set. If a rule needs a page of justification, it belongs in a bigger template.

---

## Which profile are you?

This template ships one profile and documents three neighbours. Find yourself before reading further.

| Profile | You are here if… | Style | Deployables | Platform floor | What platform work looks like |
| --- | --- | --- | --- | --- | --- |
| **`modular-monolith`** ← **this repo** | No decomposition force applies (see below) | Modular monolith | 1 | whatever the provider runs for you | nobody's job — the provider operates it |
| `service-based` | Teams block each other on deploys | Service-based | 3–8 | a handful, on managed foundations | part of a backend role |
| `microservices` | Coordination cost dominates engineering cost | Microservices | 15+ | substantial, still on managed foundations | a standing responsibility someone owns by name |
| `sovereign` | Self-hosting is *binding*, not preferred | Microservices | 15+ | everything, and it is fixed regardless of service count | a primary responsibility, and never resting on one person |

> **These are not maturity levels.** A modular monolith is a correct *terminal* state for most systems, not a waypoint on the road to microservices. Higher rows are not better — they are more expensive answers to pressures you may not have.

**This repo implements `modular-monolith`.** In the `sovereign` row instead? Use [sovereign-platform-template](https://github.com/tabmadi/sovereign-platform-template), which carries the same conventions at that scale. The two middle rows are positions to find yourself in, not presets to generate.

---

## What forces decomposition

Service count is an **outcome**, not a target. Each force independently justifies a boundary. **If none apply, build a modular monolith** — which is why this repo exists.

| # | Force | Test |
| --- | --- | --- |
| 1 | Independent deploy cadence | Two parts must ship without coordinating a release |
| 2 | Number of teams | Teams block each other. Conway's law — teams, not headcount, not features |
| 3 | Failure isolation | One part failing must not take another down, as a *stated requirement* |
| 4 | Resource heterogeneity | Genuinely different scaling profiles (CPU vs IO vs memory) |
| 5 | Technology heterogeneity | A part must run on another runtime (ML in Python, chain code in Rust) |
| 6 | Compliance boundary | Data residency or audit scope cheaper to enforce structurally than by policy |

Count the ones that genuinely apply. Zero is the common answer and the one this repo is built for.

---

## The stack

| Layer | Choice | Why this one |
| --- | --- | --- |
| Framework | Next.js 16, App Router | One deployable serves the UI and the API; server components remove the client-fetch layer entirely |
| Runtime & package manager | Bun | One binary for install, test, and script running |
| Styling | Tailwind 4 | No stylesheet architecture to invent |
| Data | Postgres via Drizzle | Types are generated from the schema, not asserted against it |
| Migrations | dbmate | Plain SQL, forward and back, no framework coupling |
| Lint & format | Biome | One tool, one config, no plugin resolution |
| Commits & hooks | cocogitto, lefthook | Conventional Commits, enforced at commit time |
| Tasks | mise | Pinned tools and one command surface |

---

## The seam

`src/server/domain/` holds pure functions — no React import, no database handle, no `Request`. Route handlers and server actions do transport and persistence, then call in.

```text
src/app/          routes, pages, server actions   — transport
src/server/db/    schema and queries              — persistence
src/server/domain business rules, pure            — the part that outlives this repo
```

This is the whole extraction story. When a decomposition force finally applies, the domain layer moves to a service unchanged and the route handlers become clients. Nothing else here ports — server actions and a Drizzle schema do not become a Go service — so the seam is where the value is.

---

## Getting started

```bash
mise run setup                    # dependencies and git hooks
cp .env.example .env              # then point DATABASE_URL at your database
mise run db:migrate
mise run dev
```

`mise run check` is the gate: lint, test, build. Run it before finishing any change.

---

## Documentation

Decisions live in [`docs/adr`](docs/adr) and outrank every other file, including [`AGENTS.md`](AGENTS.md). Start at [ADR-0000](docs/adr/0000-foundations.md).
