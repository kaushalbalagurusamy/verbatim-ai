---
name: safe-execute
description: "Execute commands with safety checks and validation"
---

# /safe-execute

**Usage**  
Type `/safe-execute [command]` to run commands with automatic safety checks.

**What it does**

- Pre-validates command safety
- Checks current state before execution
- Prevents destructive operations
- Verifies prerequisites
- Provides rollback suggestions

**Safety Checks Performed**

1. **Destructive Command Detection**

   - Blocks: `rm -rf /`, `format`, database drops
   - Warns: Large deletions, force pushes
   - Requires explicit confirmation

2. **State Validation**

   ```bash
   ✓ Current directory correct?
   ✓ Required files exist?
   ✓ No uncommitted changes? (for git operations)
   ✓ Ports available? (for servers)
   ✓ Dependencies installed?
   ```

3. **Environment Verification**
   - Correct Node version
   - Required tools in PATH
   - Environment variables set

**Protected Operations**
Commands requiring extra confirmation:

- `rm -rf` on directories
- `git push --force`
- `npm publish`
- Database migrations
- Production deployments
- System-wide installations

**Example Usage**

```
/safe-execute rm -rf node_modules
→ ⚠️  Destructive operation detected
→ Target: node_modules/ (1,847 files, 287MB)
→ Checking: No active processes using directory
→ Backup: Not needed (can reinstall)
→ Confirm deletion? (y/N)
```

**Smart Validations**

```
/safe-execute pnpm dev
→ Checking prerequisites...
  ✓ In correct directory: /workspace
  ✓ package.json exists
  ✓ Dependencies installed
  ✓ Port 8080 available
  ✗ Uncommitted changes detected
→ Warning: You have uncommitted changes. Commit first? (y/N)
```

**Rollback Suggestions**
For risky operations, provides rollback:

```
/safe-execute git reset --hard
→ ⚠️  This will discard all changes
→ Current changes:
  M src/App.tsx
  M package.json
→ Rollback command: git reflog + git reset
→ Continue? (y/N)
```

**Credential Protection**
Automatically detects and prevents:

- API keys in commands
- Passwords in plain text
- Tokens in git commits
- Secrets in environment exports

**Dry Run Mode**
Test commands without execution:

```
/safe-execute --dry-run "complex command"
→ Would execute: complex command
→ Prerequisites: ✓ All passed
→ Risks: None detected
→ Safe to run
```

**Command Alternatives**
Suggests safer alternatives:

- `rm -rf` → `trash` or `mv to /tmp`
- `kill -9` → `kill -TERM` first
- `npm install` → `npm ci` for consistency
- Force operations → Try without force first

**Useful for**

- Preventing accidental data loss
- Safe exploration of commands
- Learning command impacts
- Production safety
- Team onboarding
