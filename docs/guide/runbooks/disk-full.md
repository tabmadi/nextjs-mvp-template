# A disk is almost full

A file system has less than 10 percent free. A full disk stops PostgreSQL and the app.

## What to do

1. Read the `instance` and `mountpoint` labels of the alert.
2. On that machine, run `df -h` and `du -xh --max-depth=2 <mountpoint> | sort -h | tail`.
3. On the host, free old system generations: `nix-collect-garbage --delete-older-than 14d`.
4. On `db`, check the size of `/var/lib/pgbackrest` and of the WAL folder of PostgreSQL.
5. If WAL collects, follow [the WAL archiving runbook](wal-archiving-failing.md).
6. If a guest volume is too small, raise its `dataSize` in `infra/host.nix` and deploy.
