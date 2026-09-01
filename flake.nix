{
  description = "Suderman's Pi configuration";

  inputs.llm-agents.url = "github:numtide/llm-agents.nix";

  outputs = { self, llm-agents, ... }:
    let
      mkApp = system: pi:
        let
          pkgs = import llm-agents.inputs.nixpkgs { inherit system; };
          fallbackConfig = self;
        in
        let
          wrapper = pkgs.writeShellApplication {
            name = "pi";
            runtimeInputs = [ pkgs.coreutils ];
            text = ''
              officialConfig="$HOME/.pi/agent"

              if [ -d "$officialConfig" ]; then
                agentConfig="$officialConfig"
                unset PI_CODING_AGENT_DIR
              else
                agentConfig="''${XDG_STATE_HOME:-$HOME/.local/state}/pi/agent"
                mkdir -p "$agentConfig"

                for resource in AGENTS.md extensions keybindings.json mcp.json models.json prompts settings-extensions.json settings.json skills themes; do
                  ln -sfn "${fallbackConfig}/$resource" "$agentConfig/$resource"
                done

                export PI_CODING_AGENT_DIR="$agentConfig"
              fi

              if [ -f "$agentConfig/.env" ]; then
                set -a
                # shellcheck disable=SC1091
                . "$agentConfig/.env"
                set +a
              fi

              exec ${pi}/bin/pi "$@"
            '';
          };
        in
        {
          type = "app";
          program = "${wrapper}/bin/pi";
        };
    in
    {
      packages = builtins.mapAttrs (_: packages: {
        default = packages.pi;
        pi = packages.pi;
      }) llm-agents.packages;

      apps = builtins.mapAttrs (system: packages: {
        default = mkApp system packages.pi;
        pi = mkApp system packages.pi;
      }) llm-agents.packages;
    };
}
