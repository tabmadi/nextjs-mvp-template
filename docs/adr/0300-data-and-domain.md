# ADR-0300: Data and domain

**Status:** Accepted
**Decides:** Where business rules live, how the schema is defined, and how migrations are applied.

## Context

In Next.js, one function can open a database connection and render a component. So by default, business rules spread across route handlers, server actions, and components. Such code cannot be tested without a request, and it cannot be extracted without a rewrite.

The JavaScript ecosystem has no canonical ORM. It solves typing with types generated from a schema, not with accessors built at runtime. Drizzle has that shape: the schema is TypeScript, and the row types are inferred from it.

## Decision

`src/server/domain/` holds business rules as pure functions. A file in that directory imports neither React, nor a database client, nor a request type. `bun test` tests it with no fixtures.

`src/server/db/` holds the Drizzle schema and the queries against it. Row types are inferred from the schema with `$inferSelect` and `$inferInsert`. They are never written by hand.

Route handlers and server actions do transport and persistence, then call into the domain. They hold no business rules.

Migrations are plain SQL that `dbmate` applies, forward and back. The Drizzle schema and the migrations state the same facts twice. The migrations are the authority, because the application meets the database at runtime.

## Consequences

No tool keeps the schema and the migrations in step: a person does. A schema change that ships without its migration passes the type check and fails at runtime.

The seam costs an indirection on every write path. That cost pays for the extraction in [ADR-0000](0000-foundations.md). The cost is justified only if the purity rule holds with no exception.

## Rules

- A file in `src/server/domain/` imports neither React, nor a database client, nor a request type.
- A route handler or server action holds no business rule: it calls into `src/server/domain/`.
- Row types are inferred from the Drizzle schema. No row interface is written by hand.
- A schema change ships with its migration in the same commit.
- Migrations are plain SQL that `dbmate` applies, and every migration is reversible.
