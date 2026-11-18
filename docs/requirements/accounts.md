# Accounts requirements

- **Prefix:** ACC

What the accounts module does, per [ADR-0602](../adr/0602-behaviour-requirements.md) and [ADR-0304](../adr/0304-identity-and-authorization.md).

## Registration

| ID | Requirement |
| --- | --- |
| ACC-001 | The app trims and lowercases an email before it stores or compares it. |
| ACC-002 | If an email has not exactly one at sign and a dotted domain, or holds a character outside ASCII, the app rejects it. |
| ACC-003 | The app accepts a new password of 12 or more characters, with no composition rule, and counts characters, not bytes. |
| ACC-004 | If a password is longer than 1024 bytes, the app rejects it. |
| ACC-005 | If a new password contains the email or its local part, the app rejects it. |
| ACC-006 | If a registration has more than one fault, the app reports every fault at once and creates nothing. |
| ACC-007 | When a person registers, the app creates a personal organization with that user as its owner. |
| ACC-008 | The app stores a password only as an Argon2id PHC hash in a credential account. |
| ACC-009 | If an email is already registered, in any case, the app rejects the registration. |

## Sign-in and sessions

| ID | Requirement |
| --- | --- |
| ACC-010 | When a user signs in with the right password, the app opens a session. |
| ACC-011 | The app applies no password policy at sign-in, so a password from an older policy still works. |
| ACC-012 | If the email is unknown or the password is wrong, the app gives the same error. |
| ACC-013 | If a sign-in names an unknown email, the app creates no user. |
| ACC-014 | If a client signs up through Better Auth directly, the app refuses it, so every user comes from registration. |
| ACC-015 | When the app ends the sessions of a user, it ends every session it issued to that user. |

## Organizations

| ID | Requirement |
| --- | --- |
| ACC-016 | The app lets a member read and create notes in the organization of the member. |
| ACC-017 | If an actor acts in another organization, the app denies the action. |
| ACC-018 | The app lets only an owner or an admin manage an organization. |

## API credentials

| ID | Requirement |
| --- | --- |
| ACC-019 | The app gives a new API credential a prefixed secret with at least 128 random bits. |
| ACC-020 | The app stores only a hash of an API credential, and the hash verifies the same secret. |
| ACC-021 | The app never gives two API credentials the same secret. |
