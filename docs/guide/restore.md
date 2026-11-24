# Restore the database

pgBackRest archives the WAL of PostgreSQL and takes a full backup each night, per [ADR-0201](../adr/0201-self-hosted-mode.md). This guide checks the backups, rehearses a restore, and restores a lost database.

Every command runs on the `db` guest: `ssh root@10.20.0.20 -J root@<address>`. `pgbackrest-env` loads the settings of an S3 repository and runs the command as `postgres`.

## Check the backups

1. Run `pgbackrest-env pgbackrest --stanza=main info`.
2. Check that `status` is `ok` and the newest full backup is less than 26 hours old.
3. Run `pgbackrest-env pgbackrest --stanza=main check`. It archives one WAL segment and confirms it is in the repository.

## Rehearse a restore

The rehearsal restores the latest state into a scratch folder, starts it on port 5433, and removes it. The live database keeps running.

1. Create the folder: `pgbackrest-env mkdir -m 0700 /var/lib/postgresql/restore-test`.
2. Restore: `pgbackrest-env pgbackrest --stanza=main --pg1-path=/var/lib/postgresql/restore-test --archive-mode=off restore`.
3. Create an empty config: `pgbackrest-env touch /var/lib/postgresql/restore-test/postgresql.conf`.
4. Start it with the command below.
5. Wait until `pgbackrest-env psql -h /tmp -p 5433 -d app -tAc 'select pg_is_in_recovery()'` returns `f`.
6. Compare a row count with the live database, such as `select count(*) from schema_migrations`.
7. Stop it: `pgbackrest-env pg_ctl -D /var/lib/postgresql/restore-test -m fast stop`.
8. Remove the folder: `rm -rf /var/lib/postgresql/restore-test`.

```bash
pgbackrest-env pg_ctl -D /var/lib/postgresql/restore-test -l /tmp/restore-test.log -w \
  -o "-p 5433 -c listen_addresses=localhost -c unix_socket_directories=/tmp -c archive_mode=off" start
```

## Restore a lost database

1. Stop PostgreSQL: `systemctl stop postgresql`.
2. Empty its data folder: `pgbackrest-env find /var/lib/postgresql/19 -mindepth 1 -delete`.
3. Restore the latest state: `pgbackrest-env pgbackrest --stanza=main --delta restore`.
4. Start PostgreSQL: `systemctl start postgresql`.
5. Wait until `pgbackrest-env psql -tAc 'select pg_is_in_recovery()'` returns `f`.
6. Run `pgbackrest-env pgbackrest --stanza=main check`.
7. Take a new full backup: `systemctl start tabkit-postgres-backup.service`.

The default repository is a folder on the `db` guest, so it does not survive the loss of the host. A host that holds real data sets an S3 bucket in another location in `infra/settings.nix`.
