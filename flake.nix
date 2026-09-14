{
  description = "Suderman's Pi configuration";

  inputs.llm-agents.url = "github:numtide/llm-agents.nix";

  outputs =
    { llm-agents, ... }:
    let
      mkPi =
        system: pi:
        let
          pkgs = import llm-agents.inputs.nixpkgs { inherit system; };
          configSource = pkgs.lib.fileset.toSource {
            root = ./.;
            fileset = pkgs.lib.fileset.unions [
              ./AGENTS.md
              ./extensions
              ./keybindings.json
              ./mcp.json
              ./models.json
              ./prompts
              ./settings-extensions.json
              ./settings.json
              ./skills
              ./themes
            ];
          };
        in
        pkgs.writeShellApplication {
          name = "pi";
          runtimeInputs = [ pkgs.coreutils ];
          text = ''
            officialConfig="$HOME/.pi/agent"

            if [ -d "$officialConfig" ]; then
              agentConfig="$officialConfig"
            else
              # Pi writes auth, locks, and package data beside its config, so
              # stage the immutable fallback in one disposable writable tree.
              agentConfig="$(mktemp -d "''${TMPDIR:-/tmp}/pi-agent.XXXXXXXX")"
              trap 'rm -rf "$agentConfig"' EXIT
              cp -R --no-preserve=mode "${configSource}/." "$agentConfig/"

              mkdir "$agentConfig/tmp"
              export TMPDIR="$agentConfig/tmp"
              export NPM_CONFIG_CACHE="$agentConfig/npm-cache"
              export PI_LENS_HOME="$agentConfig/pi-lens"
              export PI_LENS_CONFIG_PATH="''${PI_LENS_CONFIG_PATH:-$agentConfig/pi-lens.json}"
              export FFF_FRECENCY_DB="''${FFF_FRECENCY_DB:-$agentConfig/fff/frecency}"
              export FFF_HISTORY_DB="''${FFF_HISTORY_DB:-$agentConfig/fff/history}"
            fi

            export PI_CODING_AGENT_DIR="$agentConfig"

            if [ -f "$agentConfig/.env" ]; then
              set -a
              # shellcheck disable=SC1091
              . "$agentConfig/.env"
              set +a
            fi

            export PI_LENS_CONFIG_PATH="''${PI_LENS_CONFIG_PATH:-''${XDG_CONFIG_HOME:-$HOME/.config}/pi/pi-lens.json}"
            export PI_LENS_HOME="''${PI_LENS_HOME:-''${XDG_STATE_HOME:-$HOME/.local/state}/pi/pi-lens}"
            export PILENS_DATA_DIR="''${PILENS_DATA_DIR:-$PI_LENS_HOME/projects}"
            export FFF_FRECENCY_DB="''${FFF_FRECENCY_DB:-''${XDG_STATE_HOME:-$HOME/.local/state}/pi/fff/frecency}"
            export FFF_HISTORY_DB="''${FFF_HISTORY_DB:-''${XDG_STATE_HOME:-$HOME/.local/state}/pi/fff/history}"

            ${pi}/bin/pi "$@"
          '';
          meta = pi.meta // {
            description = "Pi with Suderman's bundled configuration";
            mainProgram = "pi";
          };
        };

      packages = builtins.mapAttrs (
        system: upstreamPackages:
        let
          pi = mkPi system upstreamPackages.pi;
        in
        {
          default = pi;
          inherit pi;
        }
      ) llm-agents.packages;
    in
    {
      inherit packages;

      apps = builtins.mapAttrs (
        _: systemPackages:
        let
          app = {
            type = "app";
            program = "${systemPackages.pi}/bin/pi";
            meta.description = systemPackages.pi.meta.description;
          };
        in
        {
          default = app;
          pi = app;
        }
      ) packages;
    };
}
