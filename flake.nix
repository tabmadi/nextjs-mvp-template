# The toolchain, the git hooks, the app, its image, and the checks, per ADR-0100 and ADR-0200.
# The tabnix module holds every shared part, and this file adds the parts of the app.
{
  description = "A Next.js modular monolith for one product, one deployable, and one team";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
    # A new version is a new tag here.
    tabnix = {
      url = "github:tabmadi/tabnix/v0.3.0";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-parts.follows = "flake-parts";
    };
    # bun.nix lists every package of bun.lock, so a build installs them without network.
    bun2nix = {
      url = "github:nix-community/bun2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, tabnix, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      # The template scope adds its own checks and outputs. A copy has no template/ folder, so it adds nothing.
      imports = [
        tabnix.flakeModules.default
      ]
      ++ inputs.nixpkgs.lib.optional (builtins.pathExists ./template/scope.nix) ./template/scope.nix;

      perSystem =
        { pkgs, inputs', ... }:
        let
          bun2nix = inputs'.bun2nix.packages.default;
          # Node.js runs the app in production, per ADR-0100.
          nodejs = pkgs.nodejs_24;
          # Biome finds its config in .config/ only through this flag, per ADR-0100.
          biomeConfig = "--config-path .config";

          # The install of bun.lock. Next.js needs the hoisted layout of a plain `bun install`.
          bunInstall = {
            src = ./.;
            nativeBuildInputs = [
              bun2nix.hook
              nodejs
            ];
            bunDeps = bun2nix.fetchBunDeps { bunNix = ./bun.nix; };
            bunInstallFlags = [ "--linker=hoisted" ];
            dontUseBunBuild = true;
            dontUseBunCheck = true;
            dontUseBunInstall = true;
            dontRunLifecycleScripts = true;
            env.NEXT_TELEMETRY_DISABLED = "1";
          };

          # The standalone output of Next.js, with the static files and the migrations.
          app = pkgs.stdenv.mkDerivation (
            bunInstall
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
              nativeBuildInputs = bunInstall.nativeBuildInputs ++ [ pkgs.autoPatchelfHook ];
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

          # A check runs on the tracked files with the locked node_modules of bun.lock.
          bunCheck =
            name: tools: command:
            pkgs.stdenv.mkDerivation (
              bunInstall
              // {
                inherit name;
                nativeBuildInputs = bunInstall.nativeBuildInputs ++ tools;
                buildPhase = ''
                  export HOME=$TMPDIR
                  ${command}
                '';
                installPhase = "touch $out";
              }
            );
        in
        {
          tabnix.packages = [
            pkgs.bun
            nodejs
            pkgs.biome
            pkgs.dbmate
            pkgs.typescript-language-server
            bun2nix
          ];

          # dbmate writes no schema dump. The migrations are the authority, per ADR-0300.
          tabnix.env.DBMATE_NO_DUMP_SCHEMA = "true";

          # A fix stops the commit, so the engineer reviews the change and stages it.
          tabnix.hooks.biome = {
            name = "biome";
            entry = "${pkgs.biome}/bin/biome check ${biomeConfig} --write --no-errors-on-unmatched";
            files = "\\.(ts|tsx|js|jsx|css)$";
          };

          # bun.nix follows bun.lock, so a dependency change cannot miss it.
          tabnix.hooks.bun-nix = {
            name = "bun2nix";
            entry = "${pkgs.writeShellScript "bun-nix-check" ''
              ${bun2nix}/bin/bun2nix -o bun.nix
              ${pkgs.nixfmt}/bin/nixfmt bun.nix
              git diff --exit-code -- bun.nix
            ''}";
            files = "(^|/)(bun\\.lock|bun\\.nix)$";
            pass_filenames = false;
          };

          packages = {
            default = app;
            inherit image;
          };

          checks = {
            build = app;
            inherit image;
            lint-ts = bunCheck "lint-ts" [ pkgs.biome ] ''
              node node_modules/next/dist/bin/next typegen
              biome ci ${biomeConfig} .
              node node_modules/typescript/bin/tsc --noEmit
            '';
            test = bunCheck "test" [ pkgs.bun ] "bun test src";
            # The database tests run against a PostgreSQL that lives only inside the check.
            test-db =
              bunCheck "test-db"
                [
                  pkgs.bun
                  pkgs.dbmate
                  pkgs.postgresql_17
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
                  bun --conditions=react-server test --preload ./tests/setup.database.ts tests/integration
                  pg_ctl --wait stop
                '';
          };
        };
    };
}
