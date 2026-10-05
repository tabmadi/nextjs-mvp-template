# ADR-0303: API contracts

**Status:** Accepted
**Decides:** The wire shapes of a public HTTP endpoint: the error format, timestamps, identifiers, field casing, URL shape, and versioning, as in ADR-0303 of the sovereign profile.

## Context

The UI of this repo uses server actions, per [ADR-0400](0400-frontend.md). A project adds a public HTTP endpoint when a client outside the repo needs one: a script of a customer, an SDK, or a mobile app.

The shape of that endpoint is a contract with code that this repo does not deploy. A change to it breaks that code. A project can move to the `sovereign` profile, per [ADR-0000](0000-foundations.md). If the shapes already match ADR-0303 of the sovereign profile, the move changes no client.

## Decision

### Contract first

A public HTTP endpoint starts in `docs/reference/openapi.yaml`, an OpenAPI 3.1 file that is written by hand. The file states the request shape, the response shape, the status codes, the authentication requirement, and the errors. Route handlers implement that design.

### Errors

Errors are [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details, served as `application/problem+json`.

| Member | Value |
| --- | --- |
| `type` | `about:blank`. Where two errors share a status code and a client handles them differently, a URN: `urn:problem-type:<project>:<slug>`. Never an `https` URL |
| `title` | A stable summary. It does not change with the instance |
| `status` | The HTTP status, repeated in the body |
| `detail` | Specific to the instance, and safe to show a user. Never a stack trace, a query, or an internal hostname |
| `instance` | Omitted. `trace_id` identifies the occurrence |
| `trace_id`, an extension | The [Trace Context](https://www.w3.org/TR/trace-context/) trace-id of the request. It comes from the `traceparent` header. Without that header, the route generates one in the same format. The server logs it with the error |
| `errors`, an extension | Field-level validation failures. Each one is a JSON Pointer and a message |

### Wire formats

| Concern | Rule |
| --- | --- |
| Timestamps | [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) in UTC with a literal `Z`. A different offset is rejected, not converted |
| Durations | An integer field named for its unit, such as `timeout_seconds` |
| Identifiers | The type-prefixed UUIDv7 of [ADR-0003](0003-naming-and-identifiers.md). A bare UUID never appears on the wire |
| JSON fields | `snake_case` nouns, plural where repeated |
| Money | A decimal string. Never a JSON number |

### URL shape

Every public path is under `/api`. A path segment is a resource noun, not a verb. The first segment after `/api` names one resource family. The sovereign edge routes each first segment to one service, so a family never spans two owners.

The URL has no version segment, and no header carries a version. The API serves one live version: the current production release. A breaking change ships in one PR with its callers in the repo.

### Protocols

Server-Sent Events is the default for a stream from the server to the client. gRPC, Connect-RPC, GraphQL, and tRPC are not used.

## Consequences

A project with no public endpoint pays nothing for this ADR.

A client outside the repo that cannot upgrade with a release breaks on a breaking change. The sovereign profile has a versioning path for that case. This profile does not.

No task checks the OpenAPI file against the route handlers. A person keeps them in step.

## Rules

- A new public HTTP endpoint records its design in `docs/reference/openapi.yaml` before implementation. The file is OpenAPI 3.1 and written by hand. `(ref: OpenAPI 3.1)`
- Errors are RFC 9457 problem details served as `application/problem+json`. `type` is `about:blank` unless two errors share a status code and a client handles them differently: that case takes a `urn:problem-type:` URN. `(ref: RFC 9457)`
- Every error carries `trace_id`, from the `traceparent` header or generated in the same format, and the server logs it with the error. `(ref: W3C Trace Context)`
- `detail` contains no stack trace, query, or internal hostname.
- Timestamps on the wire are RFC 3339 in UTC with a literal `Z`. A different offset is rejected. `(ref: RFC 3339)`
- A duration is an integer field named for its unit.
- Entity identifiers on the wire are the type-prefixed UUIDv7 of [ADR-0003](0003-naming-and-identifiers.md). A bare UUID is not sent.
- JSON fields are `snake_case`. Money is a decimal string.
- Public paths are resource nouns under `/api`. The first segment after `/api` names one resource family.
- The URL and the headers carry no API version. A breaking change ships in one PR with its callers in the repo.
- Server-Sent Events is the default streaming mechanism. gRPC, Connect-RPC, GraphQL, and tRPC are not used.
