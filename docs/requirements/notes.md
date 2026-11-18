# Notes requirements

- **Prefix:** NOTE

What the notes module does, per [ADR-0602](../adr/0602-behaviour-requirements.md). It is the sample module, and a project replaces it with its own.

| ID | Requirement |
| --- | --- |
| NOTE-001 | When a member creates a valid note, the app stores it with a trimmed title, in the organization of the member. |
| NOTE-002 | If the title of a note is blank, the app rejects the note with the message `Title is required.` |
| NOTE-003 | If the title of a note is longer than the limit, the app rejects the note. |
| NOTE-004 | If a note has more than one fault, the app reports every fault at once. |
| NOTE-005 | If the app rejects a note, it stores nothing. |
| NOTE-006 | The app never shows a member the notes of another organization. |
| NOTE-007 | If the role of an actor does not allow it to read notes, the app refuses the list. |
