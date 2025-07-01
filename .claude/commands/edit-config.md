---
name: edit-config
description: "Enable editing mode for configuration files - allows Claude to modify configs"
---

# /edit-config

**Usage**  
Type `/edit-config [file-pattern]` to enable modification of configuration files.

**What it enables**  
- Modification of hidden configuration files
- Updates to .cursor/ rules and settings
- Changes to .devcontainer/ configurations
- Package.json and dependency updates
- TypeScript and build tool config changes

**Safety Features**  
- Explicit permission required before any modifications
- Shows proposed changes before applying
- Maintains backup references
- Focused on specific file patterns when provided

**Examples**  
```bash
/edit-config                    # Enable editing for all configs
/edit-config .cursor           # Only .cursor/ files
/edit-config package.json      # Just package.json
/edit-config .devcontainer     # Devcontainer configs only
```

**Modification Workflow**  
1. Run `/edit-config [pattern]`
2. Claude will ask for explicit permission before each change
3. Shows diff/preview of proposed modifications
4. User can approve, reject, or request modifications
5. Changes are applied with clear documentation

**When to use**  
- Updating development environment
- Adding new Cursor rules
- Modifying build configurations
- Updating dependencies or scripts
- Refactoring project settings

**Safety Note**  
This command explicitly enables file modification. Claude will always:
- Ask for permission before changing files
- Show you exactly what will be changed
- Allow you to review and approve each modification
- Document what was changed and why 