---
name: config-files
description: "Quick access to key configuration files (.cursor, .devcontainer, package.json, etc.)"
---

# /config-files

**Usage**  
Type `/config-files` to see the most important configuration files and their current settings.

**Key Config Files Covered**  
- `.cursor/` - IDE rules and settings
- `.devcontainer/` - Development environment config
- `package.json` - Dependencies and scripts
- `tsconfig*.json` - TypeScript configurations
- `tailwind.config.ts` - Styling configuration
- `vite.config.ts` - Build tool configuration
- `eslint.config.js` - Linting rules

**Output Format**  
Shows file path, purpose, and key settings/content for quick reference.

**Example**  
```
/config-files
→ .cursor/rules/001-architecture.mdc: Core architecture rules
→ .devcontainer/devcontainer.json: Node 20, pnpm setup
→ package.json: React, Express, TypeScript stack
```

**When to use**  
- Before making configuration changes
- Debugging environment issues
- Understanding project setup
- Code reviews involving config changes 