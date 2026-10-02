# Architecture Decision Records

Each ADR ends with a flat **Rules** section and has a one-sentence **Decides** line in its header. The *Decides* column below is the fastest complete pass over the set.

| ADR | Decides |
| --- | --- |
| [0000](0000-foundations.md) | The profile this repo implements, the principles that follow from it, and the ADR process itself |
| [0001](0001-documentation-conventions.md) | The house style for every document, comment, and UI string: Simple English on the ASD-STE100 model |
| [0100](0100-toolchain.md) | The pinned toolchain, the task surface, and what runs at commit time |
| [0300](0300-data-and-domain.md) | Where business rules live, how the schema is defined, and how migrations are applied |
| [0400](0400-frontend.md) | Rendering strategy, data access from components, and the boundary at which a client component starts |

A new ADR starts from [`_template.md`](_template.md).
