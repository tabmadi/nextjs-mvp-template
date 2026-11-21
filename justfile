# Every task, per ADR-0103. A recipe that calls a tool runs only inside the dev shell of flake.nix.

set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load

import? 'template/justfile'
import? 'infra/justfile'

# List the recipes
default:
    @just --list

# Build the dev shell, install the locked dependencies, and install the git hooks
setup:
    nix develop --command bun install --frozen-lockfile

# Run the app against the local database: the inner loop, per ADR-0200
dev: in-shell
    bun run next dev

# Production build, as standalone output
build: in-shell
    bun run next build
    cp -r .next/static .next/standalone/.next/static
    if [ -d public ]; then cp -r public .next/standalone/public; fi

# Serve the production build
start: in-shell
    NODE_ENV=production node .next/standalone/server.js

# Print a new random AUTH_SECRET
auth-secret: in-shell
    node --eval "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"

# Write bun.nix again from bun.lock. Run it after each dependency change
bun-nix: in-shell
    bun2nix -o bun.nix
    nixfmt bun.nix

# Run Renovate over this repository, per ADR-0102. The renovate workflow calls it
ci-renovate: in-shell
    nix run --inputs-from . nixpkgs#renovate

# Start the local PostgreSQL
db-up:
    docker compose up --wait postgres

# Stop the local PostgreSQL and keep its data
db-down:
    docker compose stop postgres

# Apply pending migrations
db-migrate: in-shell
    dbmate up

# Create a migration: just db-new <name>
db-new name: in-shell
    dbmate new {{ name }}

# Build the production image and load it into Docker
image:
    docker load < "$(nix build .#image --no-link --print-out-paths)"

# Run the production image against the local PostgreSQL
image-up: image
    docker compose up --wait app

# Run the unit tests
test: in-shell
    bun test src

# Start the disposable test PostgreSQL
db-test-up:
    docker compose --profile test up --wait postgres-test

# Stop and remove the disposable test PostgreSQL
db-test-down:
    docker compose --profile test rm --stop --force postgres-test

# Run the database tests against TEST_DATABASE_URL, after the migrations
test-db: in-shell
    test -n "${TEST_DATABASE_URL:-}" || { echo "TEST_DATABASE_URL is not set. Copy .env.example to .env." >&2; exit 1; }
    dbmate --env TEST_DATABASE_URL up
    bun --conditions=react-server test --preload ./tests/setup.database.ts tests/integration

# Biome, and the TypeScript compiler after the route types
lint-ts: in-shell
    bun run next typegen
    biome check --config-path .config .
    bun run tsc --noEmit

# Prose, comments, and ADRs, per ADR-0001
lint-prose: in-shell
    tabrules check

# Markdown structure and formatting, per ADR-0001
lint-md: in-shell
    rumdl check .

# Scan the working tree for committed secrets
lint-secrets: in-shell
    gitleaks dir . --no-banner

# JSON, JSONC, TOML, and YAML format, per ADR-0104
lint-data: in-shell
    dprint check

# Nix format, per ADR-0104
lint-nix: in-shell
    nixfmt --check $(git ls-files '*.nix')

# justfile format, per ADR-0104
lint-just:
    just --fmt --check

# Run every linter
lint: lint-ts lint-prose lint-md lint-secrets lint-data lint-nix lint-just

# Apply every formatter and every safe lint fix
format: in-shell
    biome check --config-path .config --write .
    rumdl check --fix .
    nixfmt $(git ls-files '*.nix')
    dprint fmt
    just --fmt

# The fast gate: run it before you finish a change. The steps run in order, because next typegen and next build both write .next/
check: lint test build

# Run exactly what CI runs: every check of flake.nix in the Nix sandbox, the database tests and the image included
ci:
    nix flake check --print-build-logs

# Push what CI built to the binary cache, per ADR-0101. Without NIX_CACHE_URL it does nothing
cache-push: in-shell
    nix-cache-push

# Write the files that follow a dependency change, per ADR-0102
deps-sync: bun-nix

[private]
in-shell:
    @test -n "${IN_NIX_SHELL:-}" || { echo "Enter the dev shell first: run nix develop, or allow direnv." >&2; exit 1; }
