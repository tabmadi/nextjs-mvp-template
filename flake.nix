# The toolchain, the git hooks, the app, its image, and the checks, per ADR-0100, ADR-0110, ADR-0200, and ADR-0201.
# The tabkit module holds every shared part, and this file adds the parts of the app.
{
  description = "A Next.js modular monolith for one product, one deployable, and one team";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
    # A new version is a new tag here.
    tabkit = {
      url = "github:tabmadi/tabkit/v0.20.0";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-parts.follows = "flake-parts";
      # Only the own checks of tabkit read this input, so it adds no second nixpkgs here.
      inputs.nixos-stable.follows = "nixpkgs";
    };
    # The disk layout of the self-hosted mode, per ADR-0201. A project on a provider never fetches it.
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, tabkit, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      # The template scope adds its own checks and outputs. A copy has no template/ folder, so it adds nothing.
      # The bun module of tabkit holds Bun, bun2nix, the hook for bun.nix, and the install and check helpers.
      imports = [
        tabkit.flakeModules.default
        tabkit.flakeModules.bun
      ]
      ++ inputs.nixpkgs.lib.optional (builtins.pathExists ./template/scope.nix) ./template/scope.nix
      # The self-hosted mode of ADR-0201 adds the host, its deploy, and its full tier. A project on a provider has no infra/.
      ++ inputs.nixpkgs.lib.optional (builtins.pathExists ./infra/flake-module.nix) ./infra/flake-module.nix;

      perSystem =
        { pkgs, config, ... }:
        let
          inherit (config.tabkit.bun) install check;
          # Node.js runs the app in production, per ADR-0110.
          nodejs = pkgs.nodejs_26;
          # Biome finds its config in .config/ only through this flag, per ADR-0110.
          biomeConfig = "--config-path .config";

          # The standalone output of Next.js, with the static files and the migrations.
          app = pkgs.stdenv.mkDerivation (
            install
            // {
              pname = "app";
              version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
              buildPhase = ''
                runHook preBuild
                node node_modules/next/dist/bin/next build
                mkdir -p public
                runHook postBuild
              '';
              installPhase = ''
                runHook preInstall
                mkdir -p $out/share
                cp -r .next/standalone $out/share/app
                cp -r .next/static $out/share/app/.next/static
                cp -r public $out/share/app/public
                cp -r db/migrations $out/share/migrations
                runHook postInstall
              '';
              # The standalone output holds prebuilt native modules, such as @node-rs/argon2.
              nativeBuildInputs = install.nativeBuildInputs ++ [ pkgs.autoPatchelfHook ];
              buildInputs = [ pkgs.stdenv.cc.cc.lib ];
              autoPatchelfIgnoreMissingDeps = [ "libc.musl-x86_64.so.1" ];
              dontStrip = true;
            }
          );

          # The image that every provider runs, per ADR-0200. It runs as a user without privileges.
          image = pkgs.dockerTools.buildLayeredImage {
            name = "app";
            tag = "latest";
            contents = [ pkgs.dockerTools.caCertificates ];
            extraCommands = "mkdir -m 1777 tmp";
            config = {
              Cmd = [
                "${nodejs}/bin/node"
                "${app}/share/app/server.js"
              ];
              WorkingDir = "${app}/share/app";
              User = "1000:1000";
              Env = [
                "NODE_ENV=production"
                "NEXT_TELEMETRY_DISABLED=1"
                "HOSTNAME=0.0.0.0"
                "PORT=3000"
              ];
              ExposedPorts."3000/tcp" = { };
              Healthcheck = {
                Test = [
                  "CMD"
                  "${nodejs}/bin/node"
                  "--eval"
                  "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health/live').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
                ];
                Interval = 30000000000;
                Timeout = 3000000000;
                StartPeriod = 20000000000;
                Retries = 3;
              };
            };
          };
        in
        {
          tabkit.packages = [
            nodejs
            pkgs.biome
            pkgs.dbmate
            pkgs.typescript-language-server
          ];

          # Next.js needs Node.js and the hoisted layout of a plain `bun install`.
          tabkit.bun = {
            tools = [ nodejs ];
            installFlags = [ "--linker=hoisted" ];
            env.NEXT_TELEMETRY_DISABLED = "1";
          };

          # dbmate writes no schema dump. The migrations are the authority, per ADR-0300.
          tabkit.env.DBMATE_NO_DUMP_SCHEMA = "true";

          # A fix stops the commit, so the engineer reviews the change and stages it.
          tabkit.hooks.biome = {
            name = "biome";
            entry = "${pkgs.biome}/bin/biome check ${biomeConfig} --write --no-errors-on-unmatched";
            files = "\\.(ts|tsx|js|jsx|css)$";
          };

          packages = {
            default = app;
            inherit image;
          };

          checks = {
            build = app;
            inherit image;
            lint-ts = check "lint-ts" [ pkgs.biome ] ''
              node node_modules/next/dist/bin/next typegen
              biome ci ${biomeConfig} .
              node node_modules/typescript/bin/tsc --noEmit
            '';
            test =
              check "test" [ ]
                "NODE_OPTIONS=--conditions=react-server node node_modules/vitest/vitest.mjs run";
            # The database tests run against a PostgreSQL that lives only inside the check.
            test-db =
              check "test-db"
                [
                  pkgs.dbmate
                  pkgs.postgresql_19
                ]
                ''
                  export PGDATA=$TMPDIR/pgdata
                  initdb --username=app --auth=trust --no-instructions >/dev/null
                  pg_ctl --wait --log=$TMPDIR/pg.log \
                    --options="-c listen_addresses=127.0.0.1 -c port=5433 -c unix_socket_directories=$TMPDIR" start
                  createdb --host=127.0.0.1 --port=5433 --username=app app_test
                  export TEST_DATABASE_URL=postgres://app@127.0.0.1:5433/app_test?sslmode=disable
                  export DBMATE_NO_DUMP_SCHEMA=true
                  dbmate --env TEST_DATABASE_URL up
                  NODE_OPTIONS=--conditions=react-server node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts
                  pg_ctl --wait stop
                '';
          };
        };
    };
}
