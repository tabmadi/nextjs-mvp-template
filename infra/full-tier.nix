# The full tier of the self-hosted mode, per ADR-0201. The host runs in QEMU with its two guests nested, local
# secrets, and an empty database. A client beyond the host checks that the app migrated the database and serves.
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

  '';
}
