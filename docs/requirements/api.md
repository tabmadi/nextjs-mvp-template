# API requirements

- **Prefix:** API

What the public API does, per [ADR-0602](../adr/0602-behaviour-requirements.md) and [ADR-0303](../adr/0303-public-api.md).

| ID | Requirement |
| --- | --- |
| API-001 | When a request sends a valid credential, the app acts as a member of the organization of the credential. |
| API-002 | If a request sends no credential, or an unknown or revoked one, the app answers 401 with the error shape. |
| API-003 | When a request posts a valid note, the app creates it in the organization of the credential and lists it. |
| API-004 | If a request repeats an Idempotency-Key with the same body, the app returns the first response and does the work once. |
| API-005 | If a request repeats an Idempotency-Key with another body, the app answers 422. |
| API-006 | If a request repeats an Idempotency-Key while the first request runs, the app answers 409. |
| API-007 | If the work of an Idempotency-Key fails with a server error, the app stores nothing, so a retry runs again. |
