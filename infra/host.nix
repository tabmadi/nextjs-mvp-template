# The host of the self-hosted mode, per ADR-0201. It runs the app and the database as two microVMs, and the host
# drops every connection between them except the app to the database.
{
  lib,
  settings,
  tabkitModules,
  app,
  nodejs,
  postgresql,
  modulesPath,
  ...
}:
let
  # An S3 repository needs its keys and a route to the bucket. The default folder on vm-db needs neither.
  s3Backup = (settings.backup.repository.repo1-type or "posix") == "s3";
  smtpLogin = settings.alerts.username != null;
  net = {
    gateway = "10.20.0.1";
    app = "10.20.0.10";
    db = "10.20.0.20";
  };
in
{
  imports = [ "${modulesPath}/installer/scan/not-detected.nix" ];

  system.stateVersion = "26.05";

  # The drivers of the disks and the network of most servers and of a QEMU copy.
  boot.initrd.availableKernelModules = [
    "ahci"
    "nvme"
    "sd_mod"
    "xhci_pci"
    "virtio_pci"
    "virtio_blk"
    "virtio_scsi"
  ];
  boot.kernelModules = [
    "kvm-intel"
    "kvm-amd"
  ];
  networking.hostName = settings.hostName;

  # The first network interface is eth0, so the uplink has the same name on every machine.
  networking.usePredictableInterfaceNames = false;
  networking.useNetworkd = true;
  systemd.network.networks."10-uplink" = {
    matchConfig.Name = "eth0";
    networkConfig.DHCP = "yes";
    linkConfig.RequiredForOnline = "routable";
  };

  tabkit.server = {
    enable = true;
    inherit (settings) adminKeys;
  };

  tabkit.microvmHost = {
    enable = true;
    inherit (net) gateway;
    uplink = "eth0";
    nameservers = [
      "1.1.1.1"
      "9.9.9.9"
    ];
    inherit (settings) adminKeys;
    guests = {
      app = {
        address = net.app;
        mac = "02:00:00:00:00:10";
        vcpu = 2;
        memory = 1536;
        dataSize = 2048;
        # Caddy gets its certificate and the app sends mail, so the app reaches the internet.
        egress = true;
        publish = [
          80
          443
        ];
        secrets = {
          "app.env" = "/var/lib/secrets/app.env";
          "alerts.env" = "/var/lib/secrets/alerts.env";
        }
        // lib.optionalAttrs smtpLogin { "smtp-password" = "/var/lib/secrets/smtp-password"; };
        config = {
          imports = [
            tabkitModules.monitoring
            (import ./guests/app.nix {
              inherit
                app
                nodejs
                net
                settings
                ;
            })
          ];
        };
      };
      db = {
        address = net.db;
        mac = "02:00:00:00:00:20";
        memory = 1024;
        dataSize = 20480;
        egress = s3Backup;
        secrets = {
          "app-password" = "/var/lib/secrets/app-password";
        }
        // lib.optionalAttrs s3Backup { "pgbackrest.env" = "/var/lib/secrets/pgbackrest.env"; };
        config = {
          imports = [
            tabkitModules.postgres
            (import ./guests/db.nix {
              inherit net postgresql;
              backup = {
                inherit (settings.backup) repository;
                secrets = s3Backup;
              };
            })
          ];
        };
      };
    };
    flows = [
      {
        from = "app";
        to = "db";
        # PostgreSQL, and the node and PostgreSQL exporters for the Prometheus of the app guest.
        ports = [
          5432
          9100
          9187
        ];
      }
    ];
  };

  # The metrics of the host, for the Prometheus of the app guest.
  services.prometheus.exporters.node = {
    enable = true;
    listenAddress = net.gateway;
  };
  networking.firewall.interfaces.vm-app.allowedTCPPorts = [ 9100 ];
}
