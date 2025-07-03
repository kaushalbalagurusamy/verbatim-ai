---
name: terminal-state
description: "Track terminal state, command history, and maintain execution context"
---

# /terminal-state

**Usage**  
Type `/terminal-state [action]` to track and manage terminal execution state.

**Options**

- `/terminal-state` - Show current terminal state summary
- `/terminal-state history` - Display recent command history
- `/terminal-state pwd` - Verify current working directory
- `/terminal-state reset` - Reset terminal state tracking
- `/terminal-state save` - Save current state for reference

**What it does**

- Maintains awareness of terminal context
- Tracks command execution history
- Monitors directory changes
- Records environment modifications
- Helps prevent state confusion errors

**State Information Tracked**

```bash
# Essential state elements
Current Directory: pwd
Shell Type: $SHELL
Active Processes: ps aux | grep -v grep
Modified Files: git status --short
Environment Changes: Set variables
Command History: Last 10 commands
Exit Codes: Success/failure tracking
```

**ReAct Pattern Tracking**
Automatically tracks each command execution:

1. **THOUGHT**: What was intended
2. **ACTION**: Command executed
3. **OBSERVATION**: Output received
4. **REFLECTION**: Success/failure and next steps

**Example State Summary**

```
/terminal-state
→ Current Directory: /workspace/src/components
→ Shell: /usr/bin/zsh
→ Last Command: npm install → Success (0)
→ Active Processes:
  - pnpm dev (PID: 1234) on port 8080
→ Recent Changes:
  - Created: Button.tsx
  - Modified: package.json
→ Command History (last 5):
  1. cd src/components ✓
  2. ls -la ✓
  3. npm install ✓
  4. pnpm dev ✓ (running)
  5. pwd ✓
```

**State Validation Checks**
Before executing commands:

- ✓ Correct directory?
- ✓ Required files present?
- ✓ No conflicting processes?
- ✓ Dependencies installed?
- ✓ Previous command succeeded?

**Common State Issues Detected**

- **Lost Context**: Changed directory without awareness
- **Stale State**: Assuming old process still running
- **Failed Prerequisites**: Previous command failed
- **Environment Drift**: Variables changed unexpectedly

**Recovery Suggestions**
When state issues detected:

1. Run `pwd` to confirm location
2. Check process status
3. Verify file existence
4. Re-run failed commands
5. Reset to known good state

**Useful for**

- Preventing "wrong directory" errors
- Tracking long command sequences
- Debugging command failures
- Maintaining execution context
- Recovering from state confusion
