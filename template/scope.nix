# The template scope, per TPL-0000. The template module of tabnix adds the lint-scope check and the templates output.
# The hosting modes of TPL-0001 are two outputs: `default` for a provider, and `self-hosted`, which keeps infra/.
{ inputs, ... }:
let
  steps = ''
    1. In a new folder, run `git init` and `git add -A`. A flake sees only the files that git tracks.
    2. Change `name` in `package.json` to your own.
    3. Run `nix develop`. It downloads the tools and installs the git hooks.
    4. Run `just setup`. It installs the locked dependencies.
    5. Replace the sample `notes` module with your own modules.
    6. Rewrite `README.md` for this project.
    7. Update the contacts in `.github/SECURITY.md` and the copyright line in `LICENSE`.
    8. Install the Renovate app on the new repository.
  '';
in
{
  imports = [ inputs.tabnix.flakeModules.template ];

  tabnix.template = {
    description = "A Next.js modular monolith for one product, one deployable, and one team";
    welcomeText = ''
      # A new project

      ${steps}'';
    exclude = [ "infra" ];
    variants.self-hosted.welcomeText = ''
      # A new self-hosted project

      ${steps}9. Follow `infra/README.md` to set the host, its secrets, and its first install.
    '';
  };
}
