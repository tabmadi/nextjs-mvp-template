-- migrate:up
-- Better Auth reads users, accounts, sessions, and verifications, per ADR-0304.
CREATE TABLE users (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email              text        NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
    name               text        NOT NULL,
    email_verified     boolean     NOT NULL DEFAULT false,
    image              text,
    two_factor_enabled boolean     NOT NULL DEFAULT false,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role            text        NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX memberships_user_id_idx ON memberships (user_id);

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

-- The second factor of Better Auth, and each accepted code, per ADR-0304.
CREATE TABLE two_factors (
    id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   uuid        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    secret                    text        NOT NULL,
    backup_codes              text        NOT NULL,
    verified                  boolean     NOT NULL DEFAULT false,
    failed_verification_count integer     NOT NULL DEFAULT 0,
    locked_until              timestamptz
);

CREATE TABLE totp_used_codes (
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash  bytea       NOT NULL,
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, code_hash)
);

CREATE TABLE notes (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title           text        NOT NULL,
    body            text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_organization_id_created_at_idx ON notes (organization_id, created_at DESC);

-- The API credentials of an organization, and the stored response of each Idempotency-Key.
CREATE TABLE api_credentials (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name            text        NOT NULL,
    key_hash        text        NOT NULL UNIQUE,
    display_prefix  text        NOT NULL,
    created_by      uuid        REFERENCES users (id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    last_used_at    timestamptz,
    revoked_at      timestamptz
);

CREATE INDEX api_credentials_organization_id_idx ON api_credentials (organization_id);

CREATE TABLE idempotency_keys (
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    key             text        NOT NULL,
    request_hash    text        NOT NULL,
    status_code     integer,
    response        jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, key)
);

-- One row counts the hits of one bucket in one fixed window.
CREATE TABLE rate_limits (
    bucket       text        NOT NULL,
    window_start timestamptz NOT NULL,
    hits         integer     NOT NULL,
    PRIMARY KEY (bucket, window_start)
);

-- migrate:down
DROP TABLE rate_limits;
DROP TABLE idempotency_keys;
DROP TABLE api_credentials;
DROP TABLE notes;
DROP TABLE totp_used_codes;
DROP TABLE two_factors;
DROP TABLE verifications;
DROP TABLE sessions;
DROP TABLE accounts;
DROP TABLE memberships;
DROP TABLE organizations;
DROP TABLE users;
