# The self-hosted mode, per ADR-0201: the host, its deploy, and its full tier. flake.nix loads this file only when
# it exists, so a project on a provider has none of it.
{
  inputs,
  lib,
  withSystem,
  ...
}:
let
  system = "x86_64-linux";
  settings = import ./settings.nix;

  # The host without its disk, so the full tier runs it in QEMU.
  host =
    settings:
    withSystem system (
      { config, pkgs, ... }:
      [
        inputs.tabkit.nixosModules.server
        inputs.tabkit.nixosModules.microvm-host
        ./host.nix
        {
          _module.args = {
            inherit settings;
            app = config.packages.default;
            tabkitModules = inputs.tabkit.nixosModules;
            nodejs = inputs.nixos.legacyPackages.${system}.nodejs_26;
            # The stable release has no PostgreSQL 19, so the database alone comes from nixpkgs-unstable.
            postgresql = pkgs.postgresql_19;
          };
        }
      ]
    );
in
{
  imports = [ inputs.tabkit.flakeModules.deploy ];

  flake.nixosConfigurations.host = inputs.nixos.lib.nixosSystem {
    inherit system;
    modules = host settings ++ [
      inputs.disko.nixosModules.disko
      ./disk.nix
    ];
  };

  # A deploy that loses SSH rolls back by itself, per ADR-0201.
  tabkit.deploy.nodes.host.hostname = settings.address;

  perSystem =
    { pkgs, system, ... }:
    {
      tabkit.packages = [
        inputs.tabkit.inputs.deploy-rs.packages.${system}.default
        pkgs.nixos-anywhere
      ];

      # The full tier of the self-hosted mode: the host in QEMU, with local secrets and an empty database.
      packages = lib.optionalAttrs (system == "x86_64-linux") {
        full-tier = import ./full-tier.nix {
          inherit pkgs;
          # The full tier sends no mail: its alert mail has no login and goes to a closed local port.
          modules = host (
            settings
            // {
              site = ":80";
              alerts = {
                smarthost = "127.0.0.1:25";
                from = "alerts@localhost";
                username = null;
                requireTls = false;
              };
            }
          );
        };
      };
    };
}
