# Requirements

What the app does, per [ADR-0602](../adr/0602-behaviour-requirements.md). One file holds the behaviour of one module of the app. A test cites each ID in its name, so `just test -t NOTE-002` runs the proof of one requirement.

| File | Prefix | Module |
| --- | --- | --- |
| [accounts](accounts.md) | `ACC` | Registration, sign-in, the second factor, password reset, sessions, organizations, and API credentials |
| [api](api.md) | `API` | The public API: credentials, the error shape, and idempotent writes |
| [security](security.md) | `SEC` | Client addresses, metrics access, rate limits, and signed webhooks |
| [notes](notes.md) | `NOTE` | The sample module: notes in an organization |
