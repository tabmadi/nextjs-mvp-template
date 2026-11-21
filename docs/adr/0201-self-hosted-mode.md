# ADR-0201: Self-hosted mode

- **Status:** Accepted
- **Decides:** A project with `infra/` runs the app and the database in two microVMs on one owned NixOS machine, with an automatic rollback.

## Context

[ADR-0000](0000-foundations.md) puts this repo on a managed provider. Some products must run on a machine that they own, for cost, for data residency, or because a customer asks for it. The app, the data, and the decisions of the product stay the same. Only the delivery differs.

A project has the self-hosted mode when it has the `infra/` folder. A project without `infra/` runs on a provider, per [ADR-0200](0200-delivery.md).

One machine without an orchestrator is the limit of this mode. A product that needs more than one machine, or Kubernetes, has a decomposition or availability force, and outgrows this repo.

## Decision drivers

1. **Same app.** The app, the migrations, and the tests do not change between the modes.
2. **Isolation.** A broken app does not reach the files or the keys of the database.
3. **Safe deploy.** A deploy that breaks SSH or the network rolls back with no action from a person.
4. **One toolchain.** The lock of `flake.nix` pins the host, as it pins the app.
5. **Small operations.** One person runs the machine as a side task.

## Considered options

| Option | 1 Same app | 2 Isolation | 3 Safe deploy | 4 One toolchain | 5 Small operations | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Docker Compose on a Linux machine | Yes. It runs the image | Partly. The containers share the kernel | No. A broken deploy needs a person | No. The machine has its own packages and updates | Yes | Rejected on drivers 3 and 4 |
| Kamal on a Linux machine | Yes | Partly. The containers share the kernel | Partly. It switches traffic only to a healthy container, and a broken machine still needs a person | No | Yes. It deploys with no downtime | Rejected on driver 4. It is the next candidate when a deploy must have no downtime |
| k3s on one machine | Yes | Yes, with policies | Partly | No | No. It is an orchestrator with its own upgrades | Rejected on driver 5 |
| NixOS, every service on the host | Yes | No. The app and the database share one system | Yes | Yes | Yes | Rejected on driver 2 |
| **NixOS, with the app and the database in two microVMs** | **Yes. The guest runs the same Next.js output as the image** | **Yes. Each guest has its own kernel, and the host drops every connection except the app to the database** | **Yes. deploy-rs rolls back a deploy that loses SSH** | **Yes. The host and the guests are one NixOS system in `flake.nix`** | **Yes** | **Chosen** |

Sources:

- Each microVM runs its own kernel under KVM, and shares the store read-only: [microvm.nix README](https://github.com/microvm-nix/microvm.nix).
- deploy-rs rolls back a deploy that loses the SSH connection: [deploy-rs README](https://github.com/serokell/deploy-rs).
- Kamal switches traffic with kamal-proxy after a health check: [Kamal, deploy](https://kamal-deploy.org/docs/commands/deploy/).
- nixos-anywhere installs NixOS over SSH and partitions the disk with disko: [nixos-anywhere README](https://github.com/nix-community/nixos-anywhere).

## Decision

### The host

`infra/host.nix` is the host. It imports the tabnix modules `server` and `microvm-host`, which `flake.nix` pins by a tag, per [ADR-0100](0100-toolchain.md). SSH takes keys only, and the host routes every packet between the guests.

| Guest | Runs | Reaches |
| --- | --- | --- |
| `app` | Caddy on ports 80 and 443, the Next.js server on `127.0.0.1:3000`, and the migrations | The database on port 5432, and the internet for certificates and mail |
| `db` | PostgreSQL 19 | Nothing. It accepts only the app guest |

The host forwards ports 80 and 443 to the app guest. Caddy gets a certificate for the site of `infra/settings.nix`.

`infra/settings.nix` holds the values of one host: its name, its disk, its address, its site, and the admin keys. `infra/disk.nix` holds the layout of the disk, which boots by BIOS and by UEFI.

### The secrets

The host holds each secret as a file in `/var/lib/secrets`, readable by root only. The microVM host copies each file into a read-only share of its guest at each start, so no secret enters the Nix store.

| File | Guest | Holds |
| --- | --- | --- |
| `app.env` | `app` | `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` |
| `app-password` | `db` | The password of the `app` role |

The local copies live in `infra/secrets/`, which git ignores. `just host-secrets` copies them to the host. The connection from the app to the database uses `sslmode=disable`, because it never leaves the host.

### The migrations

The unit `app-migrate` in the app guest runs `dbmate up` before the app starts. It runs once for each start of the app, and only one app runs. So the migrations run as an explicit step before the new app serves traffic, per [ADR-0200](0200-delivery.md).

### The deploy

`just deploy` deploys the host with deploy-rs. The host waits for a new SSH connection after the switch, and rolls back without one. A rollback returns only to a generation that deploy-rs made, so the first deploy after an install changes nothing. A deploy restarts each guest whose system changed, so the app is down for the restart.

A NixOS release upgrade is `just deploy-boot`: a deploy for the next boot, then a reboot. A live switch across releases can fail.

### The local tiers

| Tier | Recipe | Runs |
| --- | --- | --- |
| Inner loop | `just db-up`, then `just dev` | The same as on a provider, per [ADR-0200](0200-delivery.md) |
| Full tier | `just full-tier` | The host in QEMU with its two guests, local secrets, and an empty database. A client checks that the app serves and that the migrations ran |

The full tier needs KVM. It is not a step of `just ci`, because CI must finish in under ten minutes. `just ci` builds the host and runs the checks of deploy-rs.

## Consequences

The project runs the machine: the disk, the backups, and the NixOS release. A provider did this before.

A deploy of the app restarts the app guest, so each deploy has a short downtime.

The `disko` input is in `flake.nix` in both modes. A project on a provider never fetches it.

## Rules

- A project has the self-hosted mode only when it has the `infra/` folder. `flake.nix` loads `infra/flake-module.nix` only when it exists.
- The host imports the tabnix modules `server` and `microvm-host`. A connection between guests is a `flows` entry, never a rule by hand.
- A secret is a file in `/var/lib/secrets` on the host, never in git or in the Nix store.
- The migrations run in `app-migrate` before the app starts, never in the app.
- A deploy runs through deploy-rs with magic rollback. `(CI: ci)`
- The first deploy after `just host-install` changes nothing, so that a rollback has a generation to return to.
- A NixOS release upgrade is `just deploy-boot`, never a live switch.
- `just full-tier` passes before a deploy.
