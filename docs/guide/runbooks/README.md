# Runbooks

One runbook for each alert of the self-hosted mode, per [ADR-0201](../../adr/0201-self-hosted-mode.md). Each alert names its runbook in its `runbook` annotation.

| Runbook | Alerts |
| --- | --- |
| [host-down](host-down.md) | `TargetDown` |
| [disk-full](disk-full.md) | `DiskAlmostFull` |
| [disk-failed](disk-failed.md) | `RaidDegraded`, `DiskSmartFailing` |
| [backup-too-old](backup-too-old.md) | `BackupTooOld`, `BackupMissing` |
| [wal-archiving-failing](wal-archiving-failing.md) | `WalArchivingFailing` |
