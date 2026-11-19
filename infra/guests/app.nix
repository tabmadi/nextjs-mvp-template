# The app guest, per ADR-0201: Caddy in front of the Next.js server, and the migrations before each start.
{
  app,
  nodejs,
  net,
  settings,
}:
{ pkgs, ... }:
let
  # The secrets share holds DATABASE_URL, AUTH_SECRET, and AUTH_URL.
  environmentFile = "/run/host-secrets/app.env";
in
{
  # The migrations run once before the new app starts, never in the app, per ADR-0200.
  systemd.services.app-migrate = {
    description = "Apply the pending migrations";
    before = [ "app.service" ];
    requiredBy = [ "app.service" ];
    after = [ "network-online.target" ];
    wants = [ "network-online.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      EnvironmentFile = environmentFile;
      DynamicUser = true;
      Restart = "on-failure";
      RestartSec = 5;
    };
    environment.DBMATE_NO_DUMP_SCHEMA = "true";
    script = "${pkgs.dbmate}/bin/dbmate --migrations-dir ${app}/share/migrations --wait up";
  };

  systemd.services.app = {
    description = "The Next.js server";
    wantedBy = [ "multi-user.target" ];
    environment = {
      NODE_ENV = "production";
      NEXT_TELEMETRY_DISABLED = "1";
      HOSTNAME = "127.0.0.1";
      PORT = "3000";
    };
    serviceConfig = {
      ExecStart = "${nodejs}/bin/node ${app}/share/app/server.js";
      WorkingDirectory = "${app}/share/app";
      EnvironmentFile = environmentFile;
      DynamicUser = true;
      Restart = "always";
    };
  };

  services.caddy = {
    enable = true;
    virtualHosts.${settings.site}.extraConfig = "reverse_proxy 127.0.0.1:3000";
  };
}
