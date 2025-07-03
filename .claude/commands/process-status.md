---
name: process-status
description: "Check running processes, exit codes, and manage background tasks"
---

# /process-status

**Usage**  
Type `/process-status [action]` to monitor and manage running processes.

**Options**

- `/process-status` - List all running Node/npm/pnpm processes
- `/process-status check [port]` - Check what's running on a specific port
- `/process-status kill [pid/port]` - Terminate a process by PID or port
- `/process-status exit-code` - Show last command's exit code
- `/process-status background` - List background processes started in this session

**What it does**

- Tracks all processes started during the session
- Monitors exit codes and status
- Identifies zombie or hanging processes
- Helps clean up before starting new services
- Provides platform-specific commands

**Key Commands**

```bash
# Check running processes
ps aux | grep -E "node|npm|pnpm|vite"    # Unix/Mac
tasklist | findstr "node"                 # Windows

# Check port usage
lsof -i :8080                            # Unix/Mac
netstat -ano | findstr :8080             # Windows

# Check last exit code
echo $?                                  # Unix/Mac
echo %ERRORLEVEL%                        # Windows

# Kill process
kill -9 [PID]                           # Unix/Mac
taskkill /F /PID [PID]                  # Windows
```

**Exit Code Reference**

- `0` - Success
- `1` - General errors
- `2` - Misuse of shell command
- `126` - Command cannot execute
- `127` - Command not found
- `128+n` - Fatal error signal "n"
- `130` - Script terminated by Ctrl+C

**Common Process Issues**

- **EADDRINUSE**: Port already in use
- **Zombie process**: Parent died but child still running
- **Hanging process**: Process stuck, not responding
- **Memory leak**: Process consuming excessive memory

**Example Usage**

```
/process-status check 8080
→ Shows what's running on port 8080
→ Provides PID for termination if needed
→ Suggests alternative ports if occupied

/process-status exit-code
→ Shows: "Last command exit code: 0 (success)"
→ Explains what the code means
→ Suggests next steps if failed
```

**Useful for**

- Cleaning up before starting dev server
- Understanding why commands failed
- Managing multiple services
- Debugging port conflicts
- Tracking background tasks
