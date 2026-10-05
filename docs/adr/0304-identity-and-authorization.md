# ADR-0304: Identity and authorization

**Status:** Accepted
**Decides:** The password policy, the tenancy model, and the authorization seam that a project with sign-in follows, as in ADR-0304 of the sovereign profile.

## Context

The sovereign profile authenticates with Ory Kratos and authorizes with OpenFGA, per its ADR-0304. Both are servers that a team operates. This profile has no platform team, per [ADR-0000](0000-foundations.md), so neither server runs here.

Three things outlive a move to the sovereign profile:

- the password hashes of the users
- the organizations and memberships
- every place in the code that decides a permission

Kratos imports Argon2id hashes in the PHC string format, so users keep their passwords in the move. Kratos assigns a new identity ID on import. The organization model and the permission seam carry over if they already have the sovereign shape.

## Decision

This ADR does not choose a sign-in library. It fixes what the library stores and enforces.

### Passwords

| Concern | Rule |
| --- | --- |
| Hash | Argon2id, stored as a PHC string: `$argon2id$v=19$m=<memory>,t=<iterations>,p=<parallelism>$<salt>$<hash>` |
| Minimum length | 12 characters |
| Maximum length | 1024 UTF-8 bytes, which bounds the hashing cost |
| Composition rules | None. No required uppercase letter, digit, or symbol |
| Rotation | None forced |
| Similarity | A password that resembles the email of the user is rejected |
| Breach check | Off, as in the sovereign default |

The shape follows [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html): length carries the strength. Composition rules and forced rotation push users toward predictable patterns.

The session cookie is `SameSite=Lax`, `Secure`, and `HttpOnly`.

### Tenancy

The organization is the unit of authorization. Every protected resource belongs to an organization. A user acts only through a role in an organization.

Registration creates a personal organization in which the user is the owner, in the same transaction as the user. The name of a personal organization is a generic constant, never the email of the user. Membership is many to many: a user can create more organizations and receive invitations to others. A single shared default organization is not used.

### The authorization seam

Every permission decision is one call:

```ts
allowed(actor, action, resource): boolean
```

`allowed` lives in `src/server/domain/`. It is a pure function, per [ADR-0300](0300-data-and-domain.md). Its inputs are the actor with its membership, an action name, and the resource with its organization. Role checks happen inside `allowed` and nowhere else.

The sovereign profile has the same seam: `Checker.Allowed(ctx, action, resource)`, backed by OpenFGA. A move replaces the body of `allowed`. The call sites stay.

## Consequences

The user ID changes in a move: Kratos assigns its own on import. A move maps each old user ID to its new one. Every other identifier stays, per [ADR-0003](0003-naming-and-identifiers.md).

A role check inside `allowed` is role-based. A product that needs a permission on one specific resource, such as a share or a per-resource role, grows the inputs of `allowed`. The call sites do not change.

## Rules

- Passwords are Argon2id hashes stored as PHC strings. `(ref: RFC 9106)`
- A password has at least 12 characters and at most 1024 UTF-8 bytes. No composition rule and no forced rotation apply. `(ref: NIST SP 800-63B)`
- A password that resembles the email of the user is rejected.
- The session cookie is `SameSite=Lax`, `Secure`, and `HttpOnly`. `(ref: RFC 6265bis)`
- Every protected resource belongs to an organization, and a user acts only through a role in an organization.
- Registration creates a personal organization with the user as owner, in the same transaction. Its name is a generic constant, never an email.
- A single shared default organization is not used.
- Every permission decision is a call to `allowed(actor, action, resource)` in `src/server/domain/`. No route handler, server action, service, or component checks a role directly.
