# A disk failed

The mirror lost a disk, or a disk reports a SMART failure. The default host has one disk, so this alert fires only on a host that a project gives a mirror and SMART monitoring.

## What to do

1. Run `ssh root@<address> cat /proc/mdstat`.
2. Read the SMART state: `smartctl -a /dev/<disk>`.
3. Ask the provider to replace the failed disk.
4. Add the new disk to the mirror, then wait until `/proc/mdstat` shows every disk up.
5. Check that a backup exists, per [the restore guide](../restore.md).
