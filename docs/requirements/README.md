# Requirements

What the app does, per [ADR-0602](../adr/0602-behaviour-requirements.md). One file holds the behaviour of one module of the app. A test cites each ID in its name, so `bun test --test-name-pattern NOTE-002` runs the proof of one requirement.

| File | Prefix | Module |
| --- | --- | --- |
| [accounts](accounts.md) | `ACC` | Registration, sign-in, sessions, organizations, and API credentials |
| [notes](notes.md) | `NOTE` | The sample module: notes in an organization |
