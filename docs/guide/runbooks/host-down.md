# A target is down

Prometheus cannot scrape a target for two minutes. The host, a guest, or one exporter has stopped.

## What to do

1. Read the `job` and `instance` labels of the alert.
2. Run `ssh root@<address> systemctl --failed`.
3. For a guest, run `ssh root@<address> systemctl status microvm@app microvm@db`.
4. Read the log of the failed unit: `journalctl -u <unit> -n 100`.
5. Restart the unit or the guest: `systemctl restart microvm@<guest>`.
6. Check that the alert resolves within 5 minutes.

## Escalate

If the host does not answer SSH, use the console of the provider and reboot the machine.
