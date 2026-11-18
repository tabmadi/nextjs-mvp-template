# ADR-0400: Frontend

- **Status:** Accepted
- **Decides:** Rendering strategy, data access from components, and the boundary at which a client component starts.

## Context

The App Router renders on the server by default, and client interactivity is the opt-in. A reversed default brings back the fetch and loading-state layer that server components remove. The reversal happens by accident: one `useState` at the top of a tree converts the whole subtree.

## Decision drivers

1. **Little client code.** The browser gets only the code that needs browser state.
2. **One path to data.** A page reads data through the services, with no second API layer of its own.
3. **One styling system.** No stylesheet architecture to invent.

## Considered options

### Rendering and data

| Option | 1 Little client code | 2 One path to data | Verdict |
| --- | --- | --- | --- |
| A client app that fetches a JSON API | No | No. A second API layer for the app's own pages | Rejected |
| The Pages Router with `getServerSideProps` | Every page ships its components to the client | Yes | Rejected on driver 1 |
| **Server components by default, and server actions for mutations** | **Yes** | **Yes. A component calls a service** | **Chosen** |

Sources:

- [Next.js server and client components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [server actions](https://nextjs.org/docs/app/getting-started/updating-data).

### Styling

| Option | 3 One system | Verdict |
| --- | --- | --- |
| CSS-in-JS | A runtime cost, and it conflicts with server components | Rejected |
| CSS Modules | One file per component, with names to invent | Rejected on driver 3 |
| **Tailwind** | **Utility classes, with no stylesheet architecture** | **Chosen** |

Sources:

- [Tailwind CSS](https://tailwindcss.com/docs).

## Decision

Components are server components. `"use client"` marks the smallest subtree that needs browser state. It sits as deep in the tree as the interactivity allows.

A server component reads data by a call to a service in `src/server/services/`. It does not fetch its own routes over HTTP.

Mutations are server actions. A server action calls a service, which validates through `src/server/domain/` and then persists.

Styling is Tailwind utility classes. There is no CSS-in-JS and no second stylesheet architecture.

## Consequences

A deep `"use client"` means prop drilling where a context provider near the root would be shorter. This is the accepted trade: a shallow provider converts its subtree to client rendering.

## Rules

- A component is a server component unless it needs browser state or an event handler.
- `"use client"` marks the smallest subtree that requires it.
- A server component reads data by a call to a service in `src/server/services/`, never by a fetch of its own routes.
- A mutation is a server action that calls a service. The service validates through `src/server/domain/` before it persists.
- Styling is Tailwind utility classes.
