# The template scope, per TPL-0000. The template module of tabnix adds the lint-scope check and the templates output.
# The hosting modes of TPL-0001 are two outputs: `default` for a provider, and `self-hosted`, which keeps infra/.
{ inputs, ... }:
{
  imports = [ inputs.tabnix.flakeModules.template ];

  tabnix.template = {
    extraVoice = [
      "github\\.com/tabmadi"
      "blueprints"
    ];
    description = "A Next.js modular monolith for one product, one deployable, and one team";
    welcomeText = ''
      # A new project

      Follow `Starting a project` in `README.md`.
    '';
    exclude = [ "infra" ];
    variants.self-hosted.welcomeText = ''
      # A new self-hosted project

      Follow `Starting a project` in `README.md`.
    '';
  };
}
