---
name: env-state
description: "Check environment variables, paths, and system configuration"
---

# /env-state

**Usage**  
Type `/env-state [component]` to inspect environment configuration and state.

**Options**

- `/env-state` - Show comprehensive environment overview
- `/env-state path` - Display PATH and check command availability
- `/env-state node` - Node.js/npm/pnpm versions and paths
- `/env-state vars` - List all environment variables
- `/env-state shell` - Shell type and configuration
- `/env-state container` - DevContainer specific info

**What it does**

- Verifies environment is correctly configured
- Checks if required tools are in PATH
- Identifies configuration issues
- Shows current working directory and user
- Detects platform and architecture

**Key Information Gathered**

```bash
# Current context
pwd                              # Working directory
whoami                          # Current user
echo $SHELL                     # Shell type
uname -a                        # System info

# Development tools
node --version                  # Node.js version
npm --version                   # npm version
pnpm --version                  # pnpm version
git --version                   # Git version

# Path verification
echo $PATH                      # Full PATH
which node npm pnpm            # Tool locations

# Environment variables
env | grep -E "NODE|NPM|HOME"  # Relevant vars
```

**Common Environment Issues**

- **PATH missing entries**: Tools installed but not in PATH
- **Wrong Node version**: Project requires specific version
- **Missing env vars**: Required variables not set
- **Shell conflicts**: Different behavior in different shells

**Platform Detection**

```bash
# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Linux"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  echo "Windows"
fi
```

**Example Output**

```
/env-state
→ Current Directory: /workspace
→ User: vscode
→ Shell: /usr/bin/zsh
→ Platform: linux 6.10.14-linuxkit
→ Node: v20.11.0
→ pnpm: 10.11.0
→ PATH includes: /usr/local/bin:/usr/bin
→ Container: ✓ Running in DevContainer
```

**Useful for**

- Debugging "command not found" errors
- Verifying development setup
- Checking tool versions
- Understanding execution context
- Troubleshooting platform-specific issues
