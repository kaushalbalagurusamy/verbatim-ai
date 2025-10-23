# CODEX.md

This guide equips OpenAI Codex (or other OpenAI CLI driven coding agents) to work effectively in the Verbatim AI repository.

## Project Snapshot

- React + TypeScript application bootstrapped with Vite.
- Uses pnpm (10.11.0) and targets Node.js 20 (see `.nvmrc`).
- Development server runs at `http://localhost:8080`.
- Tailwind CSS and shadcn/ui provide styling primitives.

## Container Environment

Codex is provisioned inside the `.devcontainer` setup:

- Node.js 20 base image with pnpm preinstalled.
- Global OpenAI Codex CLI (`@openai/codex`) and OpenAI CLI available in the PATH.
- Config directories mounted at `/home/node/.codex` and `/home/node/.openai` (mapped to `${HOME}/.codex` and `${HOME}/.openai`).
- `OPENAI_API_KEY`, `CODEX_HOME`, and `OPENAI_CONFIG_DIR` exported automatically when defined locally.
- Secure firewall script (`init-firewall.sh`) allows access to `api.openai.com`, `api.github.com`, `github.com`, and `registry.npmjs.org` while blocking everything else.
- Port `1455` is forwarded for Codex headless login flow (see [official authentication guidance](https://github.com/openai/codex/blob/main/docs/authentication.md)).

### Research Notes

- [openai/codex](https://github.com/openai/codex) documents CLI installation via `npm install -g @openai/codex`, uses `~/.codex` for auth, and highlights port `1455` for headless authentication workflows.
- [Diatonic-AI/codex-cli-docker-mcp](https://github.com/Diatonic-AI/codex-cli-docker-mcp) demonstrates Docker best practices: bind-mounting the workspace, persisting `codex` home/logs via volumes, exposing ports `1455/8080/3000`, and wiring environment variables such as `CODEX_HOME` and `OPENAI_API_KEY`.

### Container TODO (Codex enablement)

- [x] Install the Codex CLI globally inside the dev container image.
- [x] Persist `.codex` credentials/configs by binding `${HOME}/.codex` into the container.
- [x] Export `CODEX_HOME` so CLI resolves the mounted directory automatically.
- [x] Forward port `1455` to support the web-based ChatGPT login helper from inside the container.
- [x] Document headless login procedures referencing the official authentication guide.

## Essential Commands

```bash
# Install dependencies (runs automatically post-create)
pnpm install

# Start dev server
pnpm dev

# OpenAI Codex quick checks
openai --help
openai api completions.create -m gpt-3.5-turbo-instruct -p "Hello Codex"
```

> Ensure `OPENAI_API_KEY` is set before invoking the OpenAI CLI. The container forwards the value from your host environment.

## Workflow Notes

- Follow existing project guidelines in `README.md`, `CLAUDE.md`, and `.cursor/rules` for architecture and code standards.
- Run `setup-secure-env.sh` inside the container to verify pnpm, Claude Code, and Codex CLI availability.
- Keep TypeScript strict mode happy and prefer modular, 200-line max files when extending UI components.

Happy coding with Codex!
