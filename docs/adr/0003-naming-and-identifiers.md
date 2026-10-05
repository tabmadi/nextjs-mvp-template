# ADR-0003: Naming and identifiers

**Status:** Accepted
**Decides:** Every entity identifier is a UUIDv7, stored bare and carried outside the database with a type prefix, as in ADR-0003 of the sovereign profile.

## Context

An identifier outlives the code that creates it. It sits in URLs, logs, support tickets, the scripts of clients, and the database. A change of format after launch is a data migration and an API break at the same time.

A project can move to the `sovereign` profile, per [ADR-0000](0000-foundations.md). The sovereign profile fixes the identifier format in its ADR-0003. A project that starts on the same format moves its data with no change to any identifier.

| Option | Leaks | Insert locality | Says what it names | Verdict |
| --- | --- | --- | --- | --- |
| **UUIDv7 stored, type-prefixed outside the database** | nothing: 74 random bits per value | sequential, so inserts append | yes | **Chosen.** [RFC 9562](https://www.rfc-editor.org/info/rfc9562/) for the value, and the [TypeID](https://github.com/jetify-com/typeid) form for the surface |
| `bigserial` | the count and the creation order | ideal | no | A leaked count is a business fact that nobody chose to publish |
| UUIDv4 | nothing | random, so every insert lands in a cold page | no | Every table pays the write cost, and v7 removes it at no cost |
| Bare UUIDv7 | nothing | sequential | no | A bare UUID in a log or a ticket does not say what it identifies |

## Decision

Every primary key is a UUIDv7 in a Postgres `uuid` column. Application code generates it, so the code knows the identifier before the insert. The generator does not depend on the Postgres version.

Outside the database, an identifier has the TypeID form:

```text
note_01j8xk7m3q0000000000000000
{prefix}_{UUIDv7 in 26 characters of base32}
```

| Property | Rule |
| --- | --- |
| Prefix | The singular `snake_case` form of the collection noun of the resource. The `notes` table yields `note_` |
| Where the prefixed form appears | Request and response bodies, URL path parameters, server action arguments, logs, and error messages |
| Where the bare UUID appears | The `uuid` column, and nowhere else |
| Conversion | At the transport boundary, by one module |
| Client treatment | Opaque. A client never parses, orders, or constructs an identifier, per [AIP-122](https://google.aip.dev/122) |

An identifier is not a secret. Every access to a resource is authorized, per [ADR-0304](0304-identity-and-authorization.md).

SQL tables are plural `snake_case`. Columns are singular `snake_case`. Every SQL identifier is under 63 bytes, the Postgres limit.

## Consequences

The conversion module is one more step at every transport boundary. A route handler or server action that forgets it sends a bare UUID, and no check catches it.

The sovereign profile also names cloud and cluster resources in its ADR-0003. This profile has no such resources, so that half does not apply.

## Rules

- A primary key is a UUIDv7 in a Postgres `uuid` column, generated in application code. Sequential integer keys and UUIDv4 are not used. `(ref: RFC 9562)`
- An identifier outside the database has the form `{prefix}_{base32 UUIDv7}`. `prefix` is the singular form of the collection noun of the resource. `(ref: TypeID)`
- The bare UUID appears only in the database.
- One module converts between the bare and the prefixed form, at the transport boundary.
- An identifier is opaque to its consumer. No client parses, orders, or constructs one. `(ref: AIP-122)`
- An unguessable identifier is never an access control. Every access is authorized per [ADR-0304](0304-identity-and-authorization.md).
- SQL tables are plural `snake_case`, columns are singular `snake_case`, and every SQL identifier is under 63 bytes.
