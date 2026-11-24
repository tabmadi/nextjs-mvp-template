# A backup is too old

The newest full backup is older than 26 hours, or no full backup exists. WAL archives still allow a restore, but it takes longer.

## What to do

1. Run `ssh root@10.20.0.20 -J root@<address>`.
2. Read the last run: `journalctl -u tabkit-postgres-backup -n 50`.
3. Start a backup now: `systemctl start tabkit-postgres-backup.service`.
4. Check it: `pgbackrest-env pgbackrest --stanza=main info`.
5. Check that the alert resolves within 15 minutes.

## Escalate

If two nightly backups fail in a row, follow [the WAL archiving runbook](wal-archiving-failing.md) to check the repository.
