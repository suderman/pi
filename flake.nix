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
            fi

            export PI_CODING_AGENT_DIR="$agentConfig"

            if [ -f "$agentConfig/.env" ]; then
              set -a
              # shellcheck disable=SC1091
              . "$agentConfig/.env"
              set +a
            fi

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
