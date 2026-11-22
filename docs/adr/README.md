# Architecture Decision Records

Each ADR ends with a flat **Rules** section and has a one-sentence **Decides** line in its header. The *Decides* column below is the fastest complete pass over the set.

| ADR | Decides |
| --- | --- |
| [0000](0000-foundations.md) | The profile of this repo and its principles, the recipe contract, the shape and the comparisons of an ADR, and the license |
| [0001](0001-documentation-conventions.md) | The house style for every document, comment, and UI string: Simple English on the ASD-STE100 model |
| [0100](0100-toolchain.md) | Nix with flakes pins every tool and runs every check, through the shared tabkit module, and the repo follows `nixpkgs-unstable` |
| [0101](0101-source-control-and-ci.md) | The git hooks, the commit convention and its check, the secret scan, and the CI gate |
| [0102](0102-dependency-updates.md) | Renovate proposes every update to `flake.lock`, the language lock files, and the GitHub Actions, and the CI gate decides |
| [0103](0103-tasks.md) | `just` runs every task, and the recipe names `setup`, `format`, `lint`, `test`, `check`, and `ci` are a contract |
| [0104](0104-formatters-and-linters.md) | One formatter for each tracked file type, each with a check, and every tool config in `.config/` |
| [0105](0105-editor.md) | Zed is the supported editor, with committed project settings, and no check depends on an editor |
| [0110](0110-typescript.md) | Node.js runs Next.js, Bun installs and tests, Biome lints and formats, and bun2nix gives Nix the locked dependencies |
| [0200](0200-delivery.md) | The deployable artifact, the local tiers, the CI gate, and how migrations reach production |
| [0201](0201-self-hosted-mode.md) | A project with `infra/` runs the app and the database in two microVMs on one owned NixOS machine, with an automatic rollback |
| [0300](0300-data-and-domain.md) | Where business rules live, how the schema is defined, and how migrations are applied |
| [0304](0304-identity-and-authorization.md) | Sign-in with Better Auth, the password policy, the storage of API credentials, the tenancy model, and the authorization seam |
| [0400](0400-frontend.md) | Rendering strategy, data access from components, and the boundary at which a client component starts |
| [0602](0602-behaviour-requirements.md) | What the app does is a list of EARS requirements with IDs in `docs/requirements/`, a test cites each ID, and tabkit checks the trace |

A new ADR starts from [`_template.md`](_template.md).
