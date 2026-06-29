# pi

Version-controlled global config for [Pi coding agent](https://pi.dev), cloned to `~/.pi/`.

## Structure

```
~/.pi/                     ← this repo
├── .gitignore
├── README.md
└── agent/                 ← Pi's global config dir (~/.pi/agent/)
    ├── settings.json      ← provider, model, theme, compaction
    ├── models.json        ← custom provider/model definitions
    ├── keybindings.json   ← keyboard shortcuts
    ├── AGENTS.md          ← global context loaded on every startup
    ├── SYSTEM.md          ← replaces default system prompt (optional)
    ├── APPEND_SYSTEM.md   ← appends to default system prompt (optional)
    ├── extensions/        ← TypeScript modules (tools, hooks, commands)
    ├── skills/            ← SKILL.md bundles (loaded on-demand)
    ├── prompts/           ← /templatename slash commands
    └── themes/            ← visual themes
```

## Setup

Clone directly to `~/.pi/`:

```sh
git clone <repo-url> ~/.pi
```

Then authenticate separately — Pi does not store credentials in this repo:

```sh
pi
/login
```

Or set an API key environment variable (e.g. `ANTHROPIC_API_KEY`) in your shell config.

## What is not tracked

| Path                  | Reason                                   |
| --------------------- | ---------------------------------------- |
| `agent/auth.json`     | API keys and OAuth tokens                |
| `agent/trust.json`    | Machine-specific project trust decisions |
| `agent/sessions/`     | Session history — large and ephemeral    |
| `agent/bin/`          | Auto-downloaded binaries (fd, ripgrep)   |
| `agent/node_modules/` | Installed Pi packages                    |

## Packages

Pi packages (extensions, skills, prompts, themes from npm/git) are installed with `pi install` and land in `agent/node_modules/`. They are not tracked here. Re-install on a new machine with:

```sh
pi update
```

Or re-run any `pi install npm:...` / `pi install git:...` commands for packages you use.
