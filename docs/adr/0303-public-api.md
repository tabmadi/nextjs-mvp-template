# ADR-0303: Public API

- **Status:** Accepted
- **Decides:** The public API: bearer credentials, one error shape, idempotent writes, and signed webhooks.

## Context

Customers call the API from code, CI, and agents that this repo does not deploy. A network failure can end a request after the server did its work, and the client cannot tell. So a client retries, and a retried write must not run twice. [ADR-0304](0304-identity-and-authorization.md) decides how a credential is stored. This ADR decides how the API uses it.

## Decision drivers

1. **Safe retries.** A retried write does its work once.
2. **One contract.** Every endpoint authenticates, limits, and fails in the same way.
3. **No new server.** The API runs in the app and its PostgreSQL, per [ADR-0000](0000-foundations.md).

## Considered options

### Retries of a write

| Option | 1 Safe retries | 3 No new server | Verdict |
| --- | --- | --- | --- |
| No support. The client checks before it retries | No. The check and the retry can race | Yes | Rejected on driver 1 |
| A natural key on each resource | Only for resources that have one | Yes | Rejected. A note has no natural key |
| **An `Idempotency-Key` header, with the stored response in PostgreSQL** | **Yes, for every write** | **Yes** | **Chosen** |

Sources:

- [The Idempotency-Key HTTP header field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), an IETF draft.

## Decision

An API route wraps its handler in `withApiCredential` of `src/server/http/api.ts`. The wrapper reads `Authorization: Bearer sk_...`, finds the active credential, and applies a limit of 300 requests a minute to each credential. A credential acts as a member of its organization, so it reads and writes data but never manages the organization.

Every error is `{ "error": { "code", "message" } }`, with an HTTP status that matches it:

| Status | Code | When |
| --- | --- | --- |
| 400 | `invalid_json`, `invalid_idempotency_key` | The request is malformed |
| 401 | `unauthenticated` | The credential is missing, unknown, or revoked |
| 409 | `request_in_progress` | The first request with this Idempotency-Key still runs |
| 422 | a code of the resource, or `idempotency_key_reused` | The input fails a rule, or the key came with another body |
| 429 | `rate_limited` | The credential sent too many requests |
| 500 | `internal_error` | The app failed |

A write that the client may retry runs through `idempotent`. The first request with a key claims the key in `idempotency_keys`, does the work, and stores the status and the body. A retry with the same key and body gets the stored response. A retry with another body gets 422, and a retry during the first run gets 409. A server error is not stored, so a retry runs again. A key belongs to one organization.

A webhook is signed with HMAC-SHA256 over the timestamp and the body, in the `Webhook-Signature` header, per `src/server/domain/webhooks.ts`. A receiver rejects a signature older than five minutes. The app never delivers a webhook to a private, loopback, or link-local address.

## Consequences

- Each idempotent write adds a row. A job that deletes old rows is the project's to add when the table grows.
- A client that sends no key gets no retry safety. The API accepts such a write.
- The notes API is the sample endpoint. A project replaces it with its own resources and keeps the wrapper.

## Rules

- Every API route runs through `withApiCredential`. No route reads the `Authorization` header itself.
- Every API error has the shape `{ "error": { "code", "message" } }`.
- A credential acts as a member of its organization.
- A write that a client may retry accepts `Idempotency-Key`. A retry with the same key and body returns the first response, and the work runs once.
- A webhook carries an HMAC-SHA256 signature over its timestamp and body, and is never delivered to a private, loopback, or link-local address.
