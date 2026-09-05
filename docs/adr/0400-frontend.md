# ADR-0400: Frontend

**Status:** Accepted
**Decides:** Rendering strategy, data access from components, and the boundary at which a client component starts.

## Context

The App Router makes server rendering the default and client interactivity the opt-in. Reversing that default reintroduces the fetch-and-loading-state layer that server components exist to remove, and it is reversed accidentally — one `useState` at the top of a tree converts the whole subtree.

## Decision

Components are server components. `"use client"` marks the smallest subtree that needs browser state, and it is placed as deep in the tree as the interactivity requires.

A server component reads data by calling into `src/server/`. It does not fetch its own routes over HTTP.

Mutations are server actions. They validate through `src/server/domain/`, then persist.

Styling is Tailwind utility classes. No CSS-in-JS, and no parallel stylesheet architecture.

## Consequences

Placing `"use client"` deep means prop drilling in places where a context provider near the root would be shorter. That is the trade being made: a shallow provider converts the tree above it to client rendering.

## Rules

- A component is a server component unless it needs browser state or an event handler.
- `"use client"` marks the smallest subtree that requires it.
- A server component reads data by calling into `src/server/`, never by fetching its own routes.
- A mutation is a server action that validates through `src/server/domain/` before it persists.
- Styling is Tailwind utility classes.
