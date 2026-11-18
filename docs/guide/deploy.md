# Deploy the app

A provider runs the image of `flake.nix`, per [ADR-0200](../adr/0200-delivery.md). An operator runs each deploy. No workflow deploys.

## Before the first deploy

1. Create the database at the provider. Note its URL with `sslmode=verify-full`.
2. Give the provider the CA certificate of the database, if the URL names one with `sslrootcert`.
3. Set the runtime variables at the provider: `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`.
4. Run `just auth-secret` to make a value for `AUTH_SECRET`.

## Deploy a change

1. Run `just ci`. Deploy only a commit that passes.
2. Build the image: `nix build .#image`. It writes the image archive to `result`.
3. Push the archive to the registry of the provider, with the provider's own command.
4. Apply the migrations: run `just db-migrate` with the `DATABASE_URL` of the provider.
5. Start the new image at the provider.
6. Check that `GET /api/health/live` answers `200`.

The migrations run before the new image serves traffic. The old image runs against the new schema for a short time, so a migration keeps the old code working.

## Run the image locally first

Run `just image-up`. It loads the same image into Docker and starts it against the local PostgreSQL. This is the full tier of `local`, per [ADR-0200](../adr/0200-delivery.md).

## Roll back

1. Start the previous image at the provider.
2. Keep the schema. A rollback of the image does not undo a migration.
