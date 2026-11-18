-- migrate:up
-- Better Auth reads users, accounts, sessions, and verifications, per ADR-0304.
ALTER TABLE users
    ADD COLUMN email_verified boolean NOT NULL DEFAULT false,
    ADD COLUMN image          text;

CREATE TABLE accounts (
    id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    account_id               text        NOT NULL,
    provider_id              text        NOT NULL,
    access_token             text,
    refresh_token            text,
    id_token                 text,
    access_token_expires_at  timestamptz,
    refresh_token_expires_at timestamptz,
    scope                    text,
    password                 text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider_id, account_id)
);

CREATE INDEX accounts_user_id_idx ON accounts (user_id);

-- Each password moves to a credential account. The Argon2id PHC string stays the same.
INSERT INTO accounts (user_id, account_id, provider_id, password)
SELECT id, id::text, 'credential', password_hash FROM users;

ALTER TABLE users
    DROP COLUMN password_hash,
    DROP COLUMN session_version;

CREATE TABLE sessions (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token      text        NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE verifications (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text        NOT NULL,
    value      text        NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down
DROP TABLE verifications;
DROP TABLE sessions;

ALTER TABLE users
    ADD COLUMN password_hash   text,
    ADD COLUMN session_version integer NOT NULL DEFAULT 0;

UPDATE users
SET password_hash = accounts.password
FROM accounts
WHERE accounts.user_id = users.id AND accounts.provider_id = 'credential';

ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

DROP TABLE accounts;

ALTER TABLE users
    DROP COLUMN image,
    DROP COLUMN email_verified;
