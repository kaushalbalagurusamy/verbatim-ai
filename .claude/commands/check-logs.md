---
name: check-logs
description: "Find and analyze application logs, error traces, and debugging information"
---

# /check-logs

**Usage**  
Type `/check-logs [type]` to find and display various log files and error traces.

**Options**

- `/check-logs` - Show all available logs
- `/check-logs app` - Application/server logs
- `/check-logs error` - Error logs and stack traces
- `/check-logs npm` - Package manager logs
- `/check-logs build` - Build and compilation logs
- `/check-logs container` - DevContainer/Docker logs

**What it does**

- Automatically discovers log files in common locations
- Shows recent entries from each log file
- Highlights error patterns and stack traces
- Provides timestamps and context
- Suggests debugging steps based on errors found

**Common Log Locations**

```bash
# Application logs
./logs/
./app.log
./error.log
./*.log

# NPM/pnpm logs
~/.npm/_logs/
./npm-debug.log*
./pnpm-debug.log*

# Build logs
./dist/
./build/
./.next/

# System logs (DevContainer)
/var/log/
```

**Example Usage**

```
/check-logs error
→ Searches for error logs and stack traces
→ Shows last 50 lines of each error log
→ Highlights error patterns
→ Suggests fixes for common errors
```

**Error Pattern Detection**

- JavaScript/TypeScript errors: `Error:`, `TypeError:`, `ReferenceError:`
- Build errors: `Failed to compile`, `Module not found`
- Permission errors: `EACCES`, `Permission denied`
- Network errors: `ECONNREFUSED`, `ETIMEDOUT`
- Memory errors: `ENOMEM`, `JavaScript heap out of memory`

**Useful for**

- Debugging application crashes
- Understanding build failures
- Tracking down runtime errors
- Monitoring application health
- Post-mortem analysis
