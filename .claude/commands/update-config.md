---
name: update-config
description: "Update existing configuration files with safety checks and version control"
---

# /update-config

**Usage**  
Type `/update-config [file] [changes]` to safely update configuration files.

**Supported Files**  
- `.cursor/rules/*.mdc` - Cursor rule files
- `.devcontainer/devcontainer.json` - Dev environment
- `package.json` - Dependencies and scripts
- `tsconfig*.json` - TypeScript configurations
- `tailwind.config.ts` - Styling configuration
- `vite.config.ts` - Build configuration
- `eslint.config.js` - Linting rules

**Safety Workflow**  
1. **Backup**: Creates reference to current state
2. **Analysis**: Shows current vs proposed changes
3. **Validation**: Checks for conflicts and issues
4. **Preview**: Shows exact diff before applying
5. **Apply**: Makes changes with clear documentation
6. **Verify**: Confirms changes were applied correctly

**Examples**  
```bash
/update-config package.json "add playwright dependency"
→ Safely adds playwright to dependencies

/update-config .cursor/rules/001-arch.mdc "add file size limit"
→ Updates architecture rules with new constraint

/update-config .devcontainer/devcontainer.json "change node version to 22"
→ Updates development environment configuration
```

**Change Types Supported**  
- **Dependencies**: Add, update, or remove packages
- **Scripts**: Modify npm/pnpm scripts
- **Rules**: Update Cursor rule requirements
- **Settings**: Modify IDE or tool configurations
- **Environment**: Change development environment setup

**Validation Checks**  
- JSON syntax validation for applicable files
- Dependency version compatibility
- Configuration schema validation
- Rule precedence and conflict detection
- Development environment compatibility

**Version Control Integration**  
- Documents changes in commit-ready format
- Maintains change history
- Shows impact of modifications
- Enables easy rollback if needed

**When to use**  
- Adding new development tools
- Updating project standards
- Modifying build processes
- Changing environment setup
- Evolving coding rules and practices 