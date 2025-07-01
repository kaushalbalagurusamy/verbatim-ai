# Claude Commands for Verbatim AI

This directory contains custom slash commands for Claude Code to help with project management and configuration visibility.

## Available Commands

### Configuration & Discovery Commands

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