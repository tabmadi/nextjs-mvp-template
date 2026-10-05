-- migrate:up
CREATE TABLE notes (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title           text        NOT NULL,
    body            text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_organization_id_created_at_idx ON notes (organization_id, created_at DESC);

-- migrate:down
DROP TABLE notes;
