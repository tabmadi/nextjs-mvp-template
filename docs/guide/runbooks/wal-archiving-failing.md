# WAL archiving fails

PostgreSQL cannot copy its WAL to the backup repository. New changes are not in the backups, and WAL collects on the disk of `db`.

## What to do

1. Run `ssh root@10.20.0.20 -J root@<address>`.
2. Run `pgbackrest-env pgbackrest --stanza=main check`.
3. Read the error. A wrong key, a full bucket, or a network failure shows here.
4. For an S3 repository, check `infra/settings.nix` and `/run/host-secrets/pgbackrest.env`.
5. Fix the cause, then run `check` again. Archiving catches up by itself.

## Escalate

If archiving fails for more than one hour, a restore loses data back to the last archived WAL.
