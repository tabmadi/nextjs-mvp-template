# Deploy the app

A provider runs the image of `flake.nix`, per [ADR-0200](../adr/0200-delivery.md). An operator runs each deploy. No workflow deploys.

A project with `infra/` runs on its own host instead. It follows [Deploy your own host](#deploy-your-own-host).

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

## Deploy your own host

A project with `infra/` runs on one NixOS machine, per [ADR-0201](../adr/0201-self-hosted-mode.md).

### Before the first install

1. Set each value of `infra/settings.nix`: the host name, the disk, the address, the site, and your SSH key.
2. Make the folder `infra/secrets/`. Git ignores it.
3. Write `infra/secrets/app-password` with a new random password.
4. Write `infra/secrets/app.env` with `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`.
5. Point `DATABASE_URL` at `postgres://app:<password>@10.20.0.20:5432/app?sslmode=disable`.
6. Run `just auth-secret` to make a value for `AUTH_SECRET`.
7. Run `just full-tier`. It boots the host in QEMU and checks the app.

### Install the host

1. Boot the machine into a rescue system that accepts your SSH key as root.
2. Run `just host-install`. It erases the disk of `infra/settings.nix` and installs the host.
3. Run `just host-secrets`. It copies `infra/secrets/` to the host.
4. Reboot the host: `ssh root@<address> systemctl reboot`.
5. Run `just deploy` once. It changes nothing, but a later rollback needs a generation that deploy-rs made.
6. Point the DNS name of the site at the address of the host.
7. Check that `GET /api/health/live` answers `200` on the site.

### Deploy a change to the host

1. Run `just ci`, then `just full-tier`. Deploy only a commit that passes both.
2. Run `just deploy`. The migrations run before the new app starts.
3. Check that `GET /api/health/live` answers `200`.

A deploy that loses SSH rolls back by itself after five minutes.

### Upgrade the NixOS release

1. Move the `nixpkgs` input to the new release, then run `just ci` and `just full-tier`.
2. Run `just deploy-boot`. It deploys for the next boot, then reboots the host.

### Roll back the host

Run `ssh root@<address> nixos-rebuild switch --rollback`. The schema stays, so a rollback does not undo a migration.
