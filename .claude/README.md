# Claude Commands for Verbatim AI

This directory contains custom slash commands for Claude Code to help with project management and configuration visibility.

## Available Commands

### Configuration & Discovery Commands (Read-Only)

#### `/show-hidden`

Shows all hidden files and their contents in the project. Automatically discovers new hidden files as they're added.

**Use cases:**

- Understanding project configuration
- Debugging development environment issues
- Onboarding new team members

#### `/config-files`

Quick access to key configuration files with their current settings.

**Covers:**

- `.cursor/` - IDE rules and settings
- `.devcontainer/` - Development environment
- `package.json` - Dependencies and scripts
- TypeScript, Tailwind, Vite configurations

#### `/scan-project`

Comprehensive project overview including structure, hidden files, and configuration hierarchy.

**Provides:**

- Complete project structure
- All configuration files with descriptions
- Tool relationships and dependencies
- Development environment setup

#### `/cursor-rules`

Specialized command for Cursor IDE rule management.

**Shows:**

- All `.mdc` rule files and their purposes
- Rule categories and precedence
- Active coding standards
- IDE configuration details

### File Modification Commands (Requires Edit Mode)

#### `/edit-mode`

Master toggle for enabling/disabling file modification capabilities.

**Commands:**

- `/edit-mode on` - Enable configuration file editing
- `/edit-mode off` - Disable all modifications (safety mode)
- `/edit-mode status` - Show current editing permissions

#### `/edit-config`

Enable modification of specific configuration files with safety checks.

**Features:**

- Explicit permission before changes
- Shows diffs before applying
- Focused on specific file patterns
- Maintains backup references

#### `/add-cursor-rule`

Create new Cursor rule files with proper numbering and structure.

**Capabilities:**

- Auto-numbering within categories
- Standard .mdc template generation
- Proper precedence ordering
- Interactive rule creation process

#### `/update-config`

Safely update existing configuration files with validation.

**Safety features:**

- JSON syntax validation
- Dependency compatibility checks
- Preview mode before applying
- Version control integration

#### `/sync-rules`

Synchronize development standards between Cursor rules and CLAUDE.md.

**Capabilities:**

- Compare .cursor/rules/\*.mdc with CLAUDE.md content
- Identify inconsistencies between rule systems
- Suggest updates for alignment
- Ensure consistent AI tool guidance

### Terminal & Debugging Commands

#### `/check-logs [type]`

Find and analyze application logs, error traces, and debugging information.

**Options:**

- `/check-logs` - Show all available logs
- `/check-logs app` - Application/server logs
- `/check-logs error` - Error logs and stack traces
- `/check-logs npm` - Package manager logs
- `/check-logs build` - Build and compilation logs

**Features:**

- Automatic log file discovery
- Error pattern detection and highlighting
- Debugging suggestions based on errors
- Support for common log locations

#### `/process-status [action]`

Check running processes, exit codes, and manage background tasks.

**Options:**

- `/process-status` - List all Node/npm/pnpm processes
- `/process-status check [port]` - Check what's running on a port
- `/process-status kill [pid/port]` - Terminate a process
- `/process-status exit-code` - Show last command's exit code
- `/process-status background` - List background processes

**Use cases:**

- Cleaning up before starting dev server
- Understanding why commands failed
- Managing multiple services
- Debugging port conflicts

#### `/env-state [component]`

Check environment variables, paths, and system configuration.

**Options:**

- `/env-state` - Comprehensive environment overview
- `/env-state path` - Display PATH and command availability
- `/env-state node` - Node.js/npm/pnpm versions and paths
- `/env-state vars` - List all environment variables
- `/env-state shell` - Shell type and configuration

**Helps with:**

- Debugging "command not found" errors
- Verifying development setup
- Checking tool versions
- Understanding execution context

#### `/terminal-state [action]`

Track terminal state, command history, and maintain execution context.

**Options:**

- `/terminal-state` - Show current terminal state summary
- `/terminal-state history` - Display recent command history
- `/terminal-state pwd` - Verify current working directory
- `/terminal-state reset` - Reset terminal state tracking
- `/terminal-state save` - Save current state for reference

**Features:**

- ReAct pattern tracking (Thought-Action-Observation-Reflection)
- Command success/failure history
- Directory change awareness
- State validation checks

#### `/debug-mode [on|off|status]`

Enable verbose output and enhanced debugging for terminal commands.

**Options:**

- `/debug-mode on` - Enable verbose debugging
- `/debug-mode off` - Disable debug mode
- `/debug-mode status` - Check current debug settings
- `/debug-mode trace [command]` - Run single command with full tracing

**When enabled:**

- Adds verbose flags automatically
- Shows command execution traces
- Enhances error information
- Sets debugging environment variables

#### `/safe-execute [command]`

Execute commands with safety checks and validation.

**Features:**

- Pre-validates command safety
- Detects destructive operations
- Checks prerequisites before execution
- Provides rollback suggestions
- Suggests safer alternatives

**Protected operations:**

- `rm -rf` on directories
- `git push --force`
- Database operations
- System-wide installations
- Credential exposure

## Command Design Principles

### Modular Architecture

- Each command has a specific, focused purpose
- Commands can be combined for comprehensive analysis
- Easy to add new commands for emerging needs

### Dynamic Discovery

- Commands automatically find new files as they're added
- No manual maintenance required for file lists
- Adapts to project evolution

### Consistent Output Format

- Structured, readable output
- Clear categorization of information
- Examples and usage guidance included

## Adding New Commands

1. Create a new `.md` file in this directory
2. Follow the frontmatter format:
   ```yaml
   ---
   name: command-name
   description: "Brief description of what the command does"
   ---
   ```
3. Include usage examples and clear documentation
4. Test the command in Claude Code

## Best Practices

- Keep commands focused on specific tasks
- Include clear usage examples
- Document when to use each command
- Update README when adding new commands
- Consider command combinations for complex workflows

## Integration with Development Workflow

These commands complement the project's development standards:

- Support for Cursor IDE rule management
- Visibility into devcontainer configuration
- Understanding of TypeScript and React setup
- Documentation of project architecture decisions
