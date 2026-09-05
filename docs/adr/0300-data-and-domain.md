# ADR-0300: Data and domain

**Status:** Accepted
**Decides:** Where business rules live, how the schema is defined, and how migrations are applied.

## Context

In a framework where a route handler can open a database connection and render a component in the same function, the default outcome is that business rules end up distributed across route handlers, server actions, and components. That code cannot be tested without a request and cannot be extracted without a rewrite.

The JavaScript ecosystem has no canonical ORM, and it resolves the typing problem by generating types from a schema rather than synthesising accessors at runtime. Drizzle is that shape: the schema is TypeScript, and the row types are inferred from it.

## Decision

`src/server/domain/` holds business rules as pure functions. A file in that directory imports neither React, nor a database client, nor a request type. It is unit-testable with `bun test` and no fixtures.

`src/server/db/` holds the Drizzle schema and the queries against it. Row types are inferred from the schema with `$inferSelect` and `$inferInsert`; they are never hand-written.

Route handlers and server actions do transport and persistence, then call into the domain. They hold no business rules.

Migrations are plain SQL applied by `dbmate`, forward and back. The Drizzle schema and the migrations are two representations of one truth, and the migrations are the authoritative one — the database is what the application meets at runtime.

## Consequences

Keeping the schema and the migrations in step is manual. A schema change that ships without its migration passes the type check and fails at runtime.

The seam costs an indirection on every write path. That cost is the price of the extraction story in ADR-0000, and it is only worth paying if the purity rule holds without exception.

## Rules

- A file in `src/server/domain/` imports neither React, nor a database client, nor a request type.
- A route handler or server action holds no business rule; it calls into `src/server/domain/`.
- Row types are inferred from the Drizzle schema. No hand-written row interface.
- A schema change ships with its migration in the same commit.
- Migrations are plain SQL applied by `dbmate`, and every migration is reversible.
