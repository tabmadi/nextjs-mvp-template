# The app guest, per ADR-0201: Caddy in front of the Next.js server, the migrations before each start, and the
# Prometheus and Alertmanager of the host.
{
  app,
  nodejs,
  net,
  settings,
}:
{ lib, pkgs, ... }:
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

  services.prometheus.exporters.node = {
    enable = true;
    listenAddress = net.app;
  };
  # The exporter binds the guest address, which exists only after the network is up.
  systemd.services.prometheus-node-exporter = {
    wants = [ "network-online.target" ];
    after = [ "network-online.target" ];
    startLimitIntervalSec = 0;
    serviceConfig.RestartSec = 5;
  };

  # The alerts of the host and its guests. alerts.env holds ALERT_EMAIL_TO.
  tabkit.monitoring = {
    enable = true;
    environment = "prod";
    environmentFile = "/run/host-secrets/alerts.env";
    ruleFiles = [ ../../config/monitoring/alerts.yml ];
    mail = {
      inherit (settings.alerts) smarthost from requireTls;
      authUsername = settings.alerts.username;
      authPasswordFile = lib.mkIf (settings.alerts.username != null) "/run/host-secrets/smtp-password";
    };
    scrapeConfigs = [
      {
        job_name = "node";
        static_configs = [
          {
            targets = [ "${net.gateway}:9100" ];
            labels.host = "host";
          }
          {
            targets = [ "${net.app}:9100" ];
            labels.host = "app";
          }
          {
            targets = [ "${net.db}:9100" ];
            labels.host = "db";
          }
        ];
      }
      {
        job_name = "postgres";
        static_configs = [
          {
            targets = [ "${net.db}:9187" ];
            labels.host = "db";
          }
        ];
      }
      {
        job_name = "prometheus";
        static_configs = [ { targets = [ "127.0.0.1:9090" ]; } ];
      }
    ];
  };
}
