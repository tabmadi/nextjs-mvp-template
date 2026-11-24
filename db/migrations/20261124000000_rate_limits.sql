-- migrate:up
-- One row counts the hits of one bucket in one fixed window.
CREATE TABLE rate_limits (
    bucket       text        NOT NULL,
    window_start timestamptz NOT NULL,
    hits         integer     NOT NULL,
    PRIMARY KEY (bucket, window_start)
);

-- migrate:down
DROP TABLE rate_limits;
