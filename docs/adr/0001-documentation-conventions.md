# ADR-0001: Documentation conventions

**Status:** Accepted
**Decides:** The house style for every document, comment, and log line.

## Context

Documentation drifts fastest where style is a matter of taste. Adopting published standards rather than inventing one keeps the reviewable surface small: only the deltas need arguing about.

## Decision

Prose adopts ISO 24495-1 plain language and the Google developer documentation style guide. Only the deltas below are normative.

Genre decides the path: `docs/adr/` for decisions, `docs/guide/` for procedures, `docs/reference/` for lookups.

The banned-constructs table governs every document and every code comment:

| Banned | Why | Instead |
| --- | --- | --- |
| Chronology | "we moved to X", "previously Y" — the reader has git | State what is true now |
| Intensifiers | "very", "extremely", "critical" — they carry no information | Say the measurement |
| Hedges | "generally", "typically", "should probably" — an unenforceable rule | State the rule, or drop it |
| Meta-commentary | "this section explains…" — the heading did that | Delete the sentence |
| Undecorated numbers | "~25 components" goes stale silently | Link the registry, or state the threshold and its conditions |

Before writing a number, ask whether doubling it would change the decision. If yes it is a threshold — state it with the conditions it was taken under. If no it is decoration.

Three or more items sharing two or more attributes are a table.

## Consequences

A document that passes `lint:md` can still violate this ADR, because most of the table is not mechanically checkable. Review is the gate for the rest.

## Rules

- Prose follows ISO 24495-1 and the Google developer documentation style guide. `(ref: ISO 24495-1)`
- No chronology, intensifiers, hedges, meta-commentary, or undecorated counts in any document or comment.
- Three or more items sharing two or more attributes are a table.
- Markdown passes `rumdl`. `(CI: lint:md)`
- A decision lives in `docs/adr/`, a procedure in `docs/guide/`, a lookup in `docs/reference/`.
