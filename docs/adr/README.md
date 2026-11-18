# Architecture Decision Records

Each ADR ends with a flat **Rules** section and has a one-sentence **Decides** line in its header. The *Decides* column below is the fastest complete pass over the set.

| ADR | Decides |
| --- | --- |
| [0000](0000-foundations.md) | The profile this repo implements, the principles that follow from it, the recipe contract, and the ADR process itself |
| [0001](0001-documentation-conventions.md) | The house style for every document, comment, and UI string: Simple English on the ASD-STE100 model |
| [0100](0100-toolchain.md) | Nix pins every tool, builds the app and its image, and runs every check, `just` runs every task, and Zed is the supported editor |
| [0200](0200-delivery.md) | The deployable artifact, the local tiers, the CI gate, and how migrations reach production |
| [0300](0300-data-and-domain.md) | Where business rules live, how the schema is defined, and how migrations are applied |
| [0304](0304-identity-and-authorization.md) | Sign-in with Auth.js, the password policy, the storage of API credentials, the tenancy model, and the authorization seam |
| [0400](0400-frontend.md) | Rendering strategy, data access from components, and the boundary at which a client component starts |

A new ADR starts from [`_template.md`](_template.md).
