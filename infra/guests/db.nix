# The database guest, per ADR-0201. PostgreSQL accepts only the app guest, with a password.
{ net, postgresql }:
{ lib, pkgs, ... }:
{
  services.postgresql = {
    enable = true;
    package = postgresql;
    settings.listen_addresses = lib.mkForce net.db;
    ensureDatabases = [ "app" ];
    ensureUsers = [
      {
        name = "app";
        ensureDBOwnership = true;
      }
    ];
    authentication = ''
      host app app ${net.app}/32 scram-sha-256
    '';
  };

  # The password of the app role comes from the secrets share at each start, so it never enters the Nix store.
  systemd.services.postgresql-app-password = {
    description = "Set the password of the app role";
    after = [ "postgresql-setup.service" ];
    requires = [ "postgresql-setup.service" ];
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
}
