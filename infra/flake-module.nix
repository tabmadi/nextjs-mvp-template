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
        inputs.tabnix.nixosModules.server
        inputs.tabnix.nixosModules.microvm-host
        ./host.nix
        {
          _module.args = {
            inherit settings;
            app = config.packages.default;
            nodejs = pkgs.nodejs_24;
          };
        }
      ]
    );
in
{
  imports = [ inputs.tabnix.flakeModules.deploy ];

  flake.nixosConfigurations.host = inputs.nixpkgs.lib.nixosSystem {
    inherit system;
    modules = host settings ++ [
      inputs.disko.nixosModules.disko
      ./disk.nix
    ];
  };

  # A deploy that loses SSH rolls back by itself, per ADR-0201.
  tabnix.deploy.nodes.host.hostname = settings.address;

  perSystem =
    { pkgs, system, ... }:
    {
      tabnix.packages = [
        inputs.tabnix.inputs.deploy-rs.packages.${system}.default
        pkgs.nixos-anywhere
      ];

      # The full tier of the self-hosted mode: the host in QEMU, with local secrets and an empty database.
      packages = lib.optionalAttrs (system == "x86_64-linux") {
        full-tier = import ./full-tier.nix {
          inherit pkgs;
          modules = host (settings // { site = ":80"; });
        };
      };
    };
}
