# ADR-0304: Identity and authorization

**Status:** Accepted
**Decides:** Sign-in with Auth.js, the password policy, the storage of API credentials, the tenancy model, and the authorization seam.

## Context

An MVP has real users, per [ADR-0000](0000-foundations.md). Its accounts and the API credentials of its customers move to the final product. The final product can be the `sovereign` profile, which authenticates with Ory Kratos and authorizes with OpenFGA, per its ADR-0304. Both are servers that a team operates, so neither runs here.

Kratos imports Argon2id hashes in the PHC string format. So users keep their passwords in a move. Kratos assigns a new identity ID on import, so a move maps each old user ID to its new one.

An API credential is different from a password. A customer stores it in code, CI, and agents that this repo does not deploy. If the final product cannot verify the same secret, every customer edits their systems.

## Decision

### Sign-in

The application owns the `users` table, so its data moves with a query. Auth.js handles the session and the sign-in form:

| Part | Where |
| --- | --- |
| Auth.js configuration, with the Credentials provider and JWT sessions of eight hours | `src/auth.ts` |
| Sign-in and sign-out pages | the built-in pages of Auth.js, at `/api/auth/signin` and `/api/auth/signout` |
| Registration | `/register`, a server action that calls `register` in `src/server/services/accounts.ts` |
| The password policy and email normalization | `src/server/domain/accounts.ts` |

Login never creates a user. An unknown email is checked against a dummy Argon2id hash, so the response time does not reveal the account.

Each user has a `session_version`. A token carries the version from its sign-in. On each session read, the JWT callback compares it with the stored version. An increment of the stored version ends every issued session.

### Passwords

| Concern | Rule |
| --- | --- |
| Hash | Argon2id, stored as a PHC string: `$argon2id$v=19$m=<memory>,t=<iterations>,p=<parallelism>$<salt>$<hash>` |
| Minimum length | 12 characters |
| Maximum length | 1024 UTF-8 bytes, which bounds the hashing cost |
| Composition rules | None. No required uppercase letter, digit, or symbol |
| Rotation | None forced |
| Similarity | A password that resembles the email of the user is rejected |

The shape follows [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html): length carries the strength. Composition rules and forced rotation push users toward predictable patterns. This is also the policy of the sovereign profile.

The session cookie is `SameSite=Lax`, `Secure`, and `HttpOnly`. These are the defaults of Auth.js. `Secure` applies when `AUTH_URL` is an HTTPS origin.

### API credentials

An API credential is a random secret with at least 128 bits of entropy and a fixed product prefix, such as `sk_`. The prefix lets secret scanners find a leaked credential.

The database stores the SHA-256 hash of the full secret, and the first characters of the secret for display. It never stores the secret. The secret is shown once, at creation.

`newApiCredential` in `src/server/domain/api-credentials.ts` creates one. A slow hash such as Argon2id protects a guessable password. A random 128-bit secret cannot be guessed, so SHA-256 is enough. Any final product verifies the same secret with the same hash.

### Tenancy

The organization is the unit of authorization. Every protected resource belongs to an organization. A user acts only through a role in an organization.

Registration creates a personal organization in which the user is the owner, in the same transaction as the user. The service creates it, not a database trigger, so the step is visible in code. The name of a personal organization is a generic constant, never the email of the user. Membership is many to many. The schema lets a user belong to many organizations. A single shared default organization is not used.

`requireActor` in `src/auth.ts` resolves the signed-in user to an `Actor`: the user, one organization, and the role in it. It picks the oldest membership, which is the personal organization.

### The authorization seam

Every permission decision is one call:

```ts
allowed(actor, action, resource): boolean
```

`allowed` lives in `src/server/domain/`. It is a pure function, per [ADR-0300](0300-data-and-domain.md). Its inputs are the actor with its membership, an action name, and the resource with its organization. Role checks happen inside `allowed` and nowhere else.

The notes example calls `allowed` before every read and write.

The sovereign profile has the same seam: `Checker.Allowed(ctx, action, resource)`, backed by OpenFGA. A move replaces the body of `allowed`. The call sites stay.

## Consequences

The template has no organization switcher and no invitation flow. A project that adds them changes `requireActor` and adds services. The schema stays.

The built-in sign-in page of Auth.js has no field errors and no pending state. A project replaces it with its own page when the product needs one.

A role check inside `allowed` is role-based. A product that needs a permission on one specific resource, such as a share or a per-resource role, grows the inputs of `allowed`. The call sites do not change.

A lost API credential cannot be recovered. The customer creates a new one.

## Rules

- Sign-in uses the Auth.js Credentials provider with JWT sessions. The application owns the `users` table. Login never creates a user.
- Each session read checks the session version of its token against `users.session_version`.
- Passwords are Argon2id hashes stored as PHC strings. `(ref: RFC 9106)`
- A password has at least 12 characters and at most 1024 UTF-8 bytes. No composition rule and no forced rotation apply. `(ref: NIST SP 800-63B)`
- A password that resembles the email of the user is rejected.
- The session cookie is `SameSite=Lax`, `Secure`, and `HttpOnly`. `(ref: RFC 6265bis)`
- An API credential is a random secret of at least 128 bits with a fixed product prefix. The database stores only its SHA-256 hash and a display prefix. The secret is shown once.
- Every protected resource belongs to an organization, and a user acts only through a role in an organization.
- Registration creates a personal organization with the user as owner, in the same transaction. Its name is a generic constant, never an email.
- A single shared default organization is not used.
- Every permission decision is a call to `allowed(actor, action, resource)` in `src/server/domain/`. No route handler, server action, service, or component checks a role directly.
