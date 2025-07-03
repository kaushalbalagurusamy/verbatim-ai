---
name: debug-mode
description: "Enable verbose output and enhanced debugging for terminal commands"
---

# /debug-mode

**Usage**  
Type `/debug-mode [on|off|status]` to control debugging verbosity.

**Options**

- `/debug-mode on` - Enable verbose debugging
- `/debug-mode off` - Disable debug mode
- `/debug-mode status` - Check current debug settings
- `/debug-mode trace [command]` - Run single command with full tracing

**What it does**

- Enables verbose output for all commands
- Shows hidden command details
- Traces execution step-by-step
- Captures all output streams
- Provides detailed error information

**Debug Mode Features**
When enabled, automatically adds:

```bash
# Verbose flags
npm install --verbose
pnpm install --reporter=append-only
git commands with GIT_TRACE=1

# Shell debugging
set -x  # Show commands as executed
set -e  # Exit on error
set -o pipefail  # Pipe failures cascade

# Enhanced error info
--stack-trace
--show-error-details
```

**Trace Command Execution**

```
/debug-mode trace "npm install express"
→ + pwd
  /workspace
→ + which npm
  /usr/bin/npm
→ + npm --version
  10.2.0
→ + npm install express --verbose
  npm info using npm@10.2.0
  npm info using node@v20.11.0
  [detailed output...]
→ + echo $?
  0 (success)
```

**Environment Variables Set**

```bash
# When debug mode is ON:
DEBUG=*                    # Enable all debug output
NODE_ENV=development      # Development mode
VERBOSE=1                 # Verbose flag
LOG_LEVEL=debug          # Debug logging
```

**Error Enhancement**
In debug mode, errors show:

- Full stack traces
- Environment state at failure
- Previous command history
- Suggested fixes
- Related log entries

**Performance Impact**
⚠️ Debug mode significantly increases output:

- Commands run slower
- More disk I/O for logging
- Larger terminal output
- Use only when troubleshooting

**Common Debug Scenarios**

1. **Installation Issues**

   ```bash
   npm install --verbose --loglevel silly
   ```

2. **Build Failures**

   ```bash
   NODE_OPTIONS='--trace-warnings' npm run build
   ```

3. **Git Operations**

   ```bash
   GIT_TRACE=1 GIT_TRACE_PACKET=1 git push
   ```

4. **Network Issues**
   ```bash
   NODE_DEBUG=http,https npm install
   ```

**Useful for**

- Troubleshooting silent failures
- Understanding command execution
- Debugging installation issues
- Tracing network problems
- Learning how commands work internally
