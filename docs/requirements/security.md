# Security requirements

- **Prefix:** SEC

What the shared security parts do, per [ADR-0602](../adr/0602-behaviour-requirements.md).

| ID | Requirement |
| --- | --- |
| SEC-001 | The app matches a client address against ranges of its own address family. |
| SEC-002 | While the peer is inside the ranges of the trusted proxy, the app trusts `CF-Connecting-IP`. |
| SEC-003 | If the peer is outside the ranges or the header is not an address, the app ignores the header. |
| SEC-004 | The app reads an IPv4-mapped peer as IPv4, and the last forwarded entry as the peer. |
| SEC-005 | The metrics route accepts only the configured bearer token, and refuses all requests without one. |
| SEC-006 | If a key passes its rate limit, the app refuses the attempt and stores no raw key. |
| SEC-007 | If a webhook body, secret, or timestamp is wrong, the signature check fails. |
| SEC-008 | If a webhook URL points to a private address or has no HTTPS, the app refuses it. |
