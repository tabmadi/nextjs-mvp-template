# The database guest, per ADR-0201: PostgreSQL on the tabkit module, which accepts only the app guest with a
# password, and pgBackRest, which archives the WAL and takes a nightly full backup.
{
  net,
  postgresql,
  backup,
}:
{ pkgs, ... }:
let
  waitForAddress = {
    wants = [ "network-online.target" ];
    after = [ "network-online.target" ];
    startLimitIntervalSec = 0;
    serviceConfig.RestartSec = 5;
  };
in
{
  tabkit.postgres = {
    enable = true;
    package = postgresql;
    address = net.db;
    clients = [ "${net.app}/32" ];
    openFirewall = true;
    # The guests share only the host-only network of the host, so the connection needs no TLS.
    tls = null;
    setup = ''
      SELECT 'CREATE ROLE app LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app')\gexec
      SELECT 'CREATE DATABASE app OWNER app' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'app')\gexec
    '';
    backup = {
      enable = true;
      inherit (backup) repository;
      environmentFile = if backup.secrets then "/run/host-secrets/pgbackrest.env" else null;
    };
  };

  # Only root reads the secrets share, so an operator runs pgBackRest and pg_ctl as postgres through this command.
  environment.systemPackages = [
    (pkgs.writeShellScriptBin "pgbackrest-env" ''
      if [ -r /run/host-secrets/pgbackrest.env ]; then
        set -a
        . /run/host-secrets/pgbackrest.env
        set +a
      fi
      exec ${pkgs.util-linux}/bin/runuser -u postgres -- "$@"
    '')
  ];

  # A WAL segment goes to the repository at least once a minute, so a restore loses at most one minute.
  services.postgresql.settings.archive_timeout = 60;

  # The password of the app role comes from the secrets share at each start, so it never enters the Nix store.
  systemd.services.postgresql-app-password = {
    description = "Set the password of the app role";
    after = [ "tabkit-postgres-setup.service" ];
    requires = [ "tabkit-postgres-setup.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };
    # Only root reads the share, so root reads the password and psql runs as postgres.
    script = ''
      password=$(cat /run/host-secrets/app-password)
      ${pkgs.util-linux}/bin/runuser -u postgres -- ${postgresql}/bin/psql --quiet --set=password="$password" <<'SQL'
      ALTER ROLE app WITH PASSWORD :'password';
      SQL
    '';
  };

  # The metrics of the machine and of PostgreSQL, for the Prometheus of the app guest.
  services.prometheus.exporters.node = {
    enable = true;
    listenAddress = net.db;
  };
  services.prometheus.exporters.postgres = {
    enable = true;
    listenAddress = net.db;
    runAsLocalSuperUser = true;
  };
  # An exporter binds the guest address, which exists only after the network is up.
  systemd.services.prometheus-node-exporter = waitForAddress;
  systemd.services.prometheus-postgres-exporter = waitForAddress;
}
