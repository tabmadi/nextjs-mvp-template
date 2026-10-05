# ADR-0300: Data and domain

**Status:** Accepted
**Decides:** Where business rules live, how the schema is defined, and how migrations are applied.

## Context

In Next.js, one function can open a database connection and render a component. So by default, business rules spread across route handlers, server actions, and components. Such code cannot be tested without a request, and it cannot be extracted without a rewrite.

The JavaScript ecosystem has no canonical ORM. It solves typing with types generated from a schema, not with accessors built at runtime. Drizzle has that shape: the schema is TypeScript, and the row types are inferred from it.

## Decision

The code has four layers. Each one calls only the layers below it in the table.

| Layer | Path | Holds | Does not import |
| --- | --- | --- | --- |
| Transport | `src/app/`: pages, route handlers, server actions | Input parsing and the mapping of results to responses | Repositories or the database client |
| Services | `src/server/services/` | The steps of one use case: domain checks, then repositories | Next.js request or response types |
| Repositories | `src/server/repositories/` | Database reads and writes | Business rules |
| Domain | `src/server/domain/` | Business rules as pure functions, with their own input types | React, a database client, a request type, or anything in `src/server/db/` |

`bun test` tests the domain with no fixtures. The notes example shows each layer once.

`src/server/db/` holds the Drizzle schema and the client. Row types are inferred from the schema with `$inferSelect` and `$inferInsert`. They are never written by hand.

`getDb()` in `src/server/db/client.ts` opens a `pg` pool on the first database call. An import or a build opens no connection. The app server runs on Node.js, so the client uses no Bun-only module. Services, repositories, and the client import `server-only`.

`withTransaction` runs one operation on one client. Every repository in the operation receives the transaction database. It commits on success and rolls back on failure.

Database tests live in `tests/integration/` and run against `TEST_DATABASE_URL`, never against `DATABASE_URL`. `mise run test:db` runs them.

Money is a Postgres `numeric` column and a decimal string in TypeScript and on the wire. It is never a floating-point number. A balance is a debt to a customer, so it moves exactly to any final product, per [ADR-0000](0000-foundations.md).

Migrations are plain SQL that `dbmate` applies, forward and back. The Drizzle schema and the migrations state the same facts twice. The migrations are the authority, because the application meets the database at runtime.

## Consequences

No tool keeps the schema and the migrations in step: a person does. A schema change that ships without its migration passes the type check and fails at runtime.

The seam costs an indirection on every write path. That cost pays for the extraction in [ADR-0000](0000-foundations.md). The cost is justified only if the purity rule holds with no exception.

## Rules

- A file in `src/server/domain/` imports neither React, nor a database client, nor a request type, nor anything in `src/server/db/`.
- A route handler or server action holds no business rule. It calls a service.
- A service holds no Next.js request or response type. A repository holds no business rule.
- Row types are inferred from the Drizzle schema. No row interface is written by hand.
- Money is `numeric` in Postgres and a decimal string in code and on the wire. No floating-point type holds money.
- Database connections are lazy and use a Node.js driver. No import opens a connection.
- All repositories in one transaction receive the same transaction database.
- Database tests run only against `TEST_DATABASE_URL`.
- A schema change ships with its migration in the same commit.
- Migrations are plain SQL that `dbmate` applies, and every migration is reversible.
