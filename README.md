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

**This repo implements `modular-monolith`, in two hosting modes.** `managed` runs the image at a provider. `self-hosted` runs the app and the database on one NixOS machine that you own, with no orchestrator: start with `nix flake new -t github:tabmadi/nextjs-mvp-template#self-hosted`. More than one machine, or Kubernetes, is the `sovereign` row. For that row, use [sovereign-platform-template](https://github.com/tabmadi/sovereign-platform-template), with the same conventions at that scale. The two middle rows are positions, not presets to generate.

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
| Runtime and package manager | Node.js runs the app. Bun installs, tests, and runs scripts | Node.js is the runtime of Next.js. Bun is one fast binary for the rest |
| Styling | Tailwind 4 | No stylesheet architecture to invent |
| Data | Postgres through Drizzle | Types are generated from the schema, not asserted against it |
| Migrations | dbmate | Plain SQL, forward and back, with no framework coupling |
| Lint and format | Biome | One tool, one config, and no plugin resolution |
| Commits and hooks | cocogitto, git-hooks.nix | Conventional Commits, enforced at commit time |
| Toolchain | Nix with flakes, and tabnix | Every tool pinned by one lock, and the image built from it |
| Tasks | `just` | One command surface |
| Editor | Zed | Project settings in `.zed/`, with the tools of the dev shell |

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

`src/app/notes/` is a working example of every layer, behind sign-in. Open `/register`, create an account, and sign in. The app then opens `/notes`. Delete the notes example when the first real feature exists. Keep the accounts.

This is the whole extraction plan. When a decomposition force applies, the domain layer moves to a service unchanged, and the route handlers become clients. Nothing else here ports: server actions and a Drizzle schema do not become a Go service. So the value is in the seam.

---

## Getting started

Install [Nix](https://nixos.org/download) with flakes, and Docker for the local PostgreSQL. For the editor, also install [Zed](https://zed.dev) and [direnv](https://direnv.net) with nix-direnv.

```bash
nix develop                       # the pinned tools and the git hooks
just setup                        # the locked dependencies
cp .env.example .env              # then set AUTH_SECRET to the output of just auth-secret
just db-up                        # local PostgreSQL in Docker
just db-migrate
just dev                          # the inner loop
```

`just check` is the gate: lint, test, and build. Run it before you finish a change. `just ci` runs exactly what CI runs, and the `pre-push` hook runs it, per [the testing guide](docs/guide/testing.md). `just image-up` runs the production image locally, which is the full tier of ADR-0200.

---

## Starting a project

Make a new project with Nix. It copies every file except the `template/` folder, which holds what only the template needs:

```bash
nix flake new -t github:tabmadi/nextjs-mvp-template my-project
```

Then follow these steps:

1. In the new folder, run `git init` and `git add -A`. A flake sees only the files that git tracks.
2. Change `name` in `package.json` to your own.
3. Run `nix develop`. It downloads the tools and installs the git hooks.
4. Run `just setup`. It installs the locked dependencies.
5. Replace the sample `notes` module with your own modules.
6. Rewrite this README for the project.
7. Update the contacts in `.github/SECURITY.md` and the copyright line in `LICENSE`.
8. Delete the line that starts with `A new copy` from `AGENTS.md`.
9. Set the squash merge message to the pull request title, with no body, and turn off the other merge styles:

   ```bash
   gh api -X PATCH repos/OWNER/REPO -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK -F allow_merge_commit=false -F allow_rebase_merge=false
   ```

10. Install the [Renovate app](https://github.com/apps/renovate) on the new repository.
11. For the `self-hosted` output, follow `infra/README.md` to set the host, its secrets, and its first install.

### With the GitHub template button

The button copies every file, the `template/` folder included. Its first commit, `Initial commit`, is not a Conventional Commit.

1. Clone the new repository, and run `nix develop` in it.
2. Run `just init`. Choose `managed` or `self-hosted`. It removes the `template/` folder and the `A new copy` line of `AGENTS.md`.
3. Replace the first commit of GitHub. This is safe before anyone else clones the repository:

   ```bash
   git add -A
   git commit --amend -m "chore: start from <template> <release>"
   git push --force-with-lease
   ```

4. Follow the steps above from step 2, and skip the step on `AGENTS.md`. Your repository already has git.

---

## Documentation

Decisions live in [`docs/adr`](docs/adr) and rank above every other file, including [`AGENTS.md`](AGENTS.md). Start at [ADR-0000](docs/adr/0000-foundations.md). `template/adr/0000-template-contract.md` records what makes this repo a template.

[ADR-0001](docs/adr/0001-documentation-conventions.md) holds the rules for every text in the repo: Simple English, the banned constructs, and the comment rules.

What the app does lives in [`docs/requirements`](docs/requirements/README.md), one file for each module, per [ADR-0602](docs/adr/0602-behaviour-requirements.md). A test cites each requirement by its ID.

## License

Apache License 2.0. See [LICENSE](LICENSE).
