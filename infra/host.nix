# The host of the self-hosted mode, per ADR-0201. It runs the app and the database as two microVMs, and the host
# drops every connection between them except the app to the database.
{
  settings,
  app,
  nodejs,
  modulesPath,
  ...
}:
let
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

  tabnix.server = {
    enable = true;
    inherit (settings) adminKeys;
  };

  tabnix.microvmHost = {
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
        secrets."app.env" = "/var/lib/secrets/app.env";
        config = import ./guests/app.nix {
          inherit
            app
            nodejs
            net
            settings
            ;
        };
      };
      db = {
        address = net.db;
        mac = "02:00:00:00:00:20";
        memory = 1024;
        dataSize = 20480;
        secrets."app-password" = "/var/lib/secrets/app-password";
        config = import ./guests/db.nix { inherit net; };
      };
    };
    flows = [
      {
        from = "app";
        to = "db";
        ports = [ 5432 ];
      }
    ];
  };
}
