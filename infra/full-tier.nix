# The full tier of the self-hosted mode, per ADR-0201. The host runs in QEMU with its two guests nested, local
# secrets, and an empty database. A client beyond the host checks that the app migrated the database and serves.
# The host also takes a backup, restores it into a scratch folder, and scrapes every exporter.
{ pkgs, modules }:
let
  keys = import "${pkgs.path}/nixos/tests/ssh-keys.nix" pkgs;
  password = "local-full-tier";
  appEnv = pkgs.writeText "app.env" ''
    DATABASE_URL=postgres://app:${password}@10.20.0.20:5432/app?sslmode=disable
    AUTH_SECRET=local-full-tier-secret-with-at-least-32-characters
    AUTH_URL=http://host
  '';
in
pkgs.testers.runNixOSTest {
  name = "full-tier";

  nodes = {
    host =
      { lib, ... }:
      {
        imports = modules;
        virtualisation = {
          cores = 4;
          memorySize = 3072;
          diskSize = 8192;
          qemu.options = [
            "-cpu"
            "kvm64,+svm,+vmx"
          ];
        };
        # The client finds the host by the name of its node.
        networking.hostName = lib.mkForce "host";
        tabkit.server.adminKeys = lib.mkForce [ keys.snakeOilEd25519PublicKey ];
        tabkit.microvmHost = {
          uplink = lib.mkForce "eth1";
          adminKeys = lib.mkForce [ keys.snakeOilEd25519PublicKey ];
          guests.app.memory = lib.mkForce 1024;
          guests.db.memory = lib.mkForce 512;
        };
        # The local secrets reach the host at run time, as on a deployed host.
        systemd.tmpfiles.rules = [
          "d /var/lib/secrets 0700 root root -"
          "C /var/lib/secrets/app.env 0400 root root - ${appEnv}"
          "f /var/lib/secrets/app-password 0400 root root - ${password}"
          "f /var/lib/secrets/alerts.env 0400 root root - ALERT_EMAIL_TO=operator@localhost"
        ];
      };
    client.environment.systemPackages = [ pkgs.curl ];
  };

  testScript = ''
    ssh = "ssh -n -i /root/key -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5"

    start_all()
    host.succeed("install -m 0600 ${keys.snakeOilEd25519PrivateKey} /root/key")
    host.wait_for_unit("microvm@db.service", timeout=600)
    host.wait_for_unit("microvm@app.service", timeout=600)

    with subtest("The app serves from beyond the host"):
        try:
            client.wait_until_succeeds("curl -sf http://host/api/health/live", timeout=300)
        except Exception:
            # The logs of the app guest show why the app does not serve.
            host.execute(f"{ssh} root@10.20.0.10 'systemctl --no-pager status app-migrate app caddy; journalctl --no-pager -n 80 -u app-migrate -u app -u caddy' >&2")
            raise
        client.succeed("curl -sf -o /dev/null http://host/register")

    with subtest("The app migrated the empty database"):
        query = "SELECT count(*) FROM schema_migrations"
        count = host.succeed(f"{ssh} root@10.20.0.20 \"runuser -u postgres -- psql -d app -tAc '{query}'\"").strip()
        expected = "${toString (builtins.length (builtins.attrNames (builtins.readDir ../db/migrations)))}"
        assert count == expected, count

    db = f"{ssh} root@10.20.0.20"
    app = f"{ssh} root@10.20.0.10"

    with subtest("A full backup runs, and the age metric records it"):
        host.succeed(f"{db} systemctl start tabkit-postgres-backup.service")
        host.succeed(f"{db} 'pgbackrest-env pgbackrest --stanza=main info' | grep -q 'full backup'")
        host.succeed(f"{db} grep -q '^pgbackrest_last_full_backup_timestamp_seconds' /var/lib/tabkit-metrics/pgbackrest.prom")

    with subtest("The backup restores into a scratch folder with every migration"):
        scratch = "/var/lib/postgresql/restore-test"
        host.succeed(f"{db} 'pgbackrest-env mkdir -m 0700 {scratch}'")
        host.succeed(f"{db} 'pgbackrest-env pgbackrest --stanza=main --pg1-path={scratch} --archive-mode=off restore'")
        host.succeed(f"{db} 'pgbackrest-env touch {scratch}/postgresql.conf'")
        host.succeed(f"{db} \"pgbackrest-env pg_ctl -D {scratch} -l /tmp/restore-test.log -w -o '-p 5433 -c listen_addresses=localhost -c unix_socket_directories=/tmp -c archive_mode=off' start\"")
        host.wait_until_succeeds(f"{db} \"pgbackrest-env psql -h /tmp -p 5433 -d app -tAc 'select pg_is_in_recovery()'\" | grep -qx f", timeout=120)
        restored = host.succeed(f"{db} \"pgbackrest-env psql -h /tmp -p 5433 -d app -tAc '{query}'\"").strip()
        assert restored == expected, restored
        host.succeed(f"{db} 'pgbackrest-env pg_ctl -D {scratch} -m fast stop'")

    with subtest("Prometheus scrapes every target and loads the backup alerts"):
        try:
            host.wait_until_succeeds(
                f"{app} \"curl -s http://127.0.0.1:9090/api/v1/targets\" | grep -o '\"health\":\"up\"' | wc -l | grep -qx 5",
                timeout=180,
            )
        except Exception:
            # Each target with its health and last error shows which scrape fails.
            host.execute(f"{app} \"curl -s http://127.0.0.1:9090/api/v1/targets\" | grep -o '\"scrapeUrl\":\"[^\"]*\"\\|\"lastError\":\"[^\"]*\"\\|\"health\":\"[a-z]*\"' >&2")
            host.execute(f"{db} 'systemctl --no-pager status prometheus-node-exporter prometheus-postgres-exporter; ss -ltn; nft list ruleset | grep -n dport' >&2")
            raise
        host.succeed(f"{app} \"curl -s http://127.0.0.1:9090/api/v1/rules\" | grep -q BackupTooOld")
        host.succeed(f"{app} \"curl -s http://127.0.0.1:9090/api/v1/query?query=pgbackrest_last_full_backup_timestamp_seconds\" | grep -q pgbackrest_last_full_backup")
        host.succeed(f"{app} systemctl is-active alertmanager")

  '';
}
