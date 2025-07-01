---
name: scan-project
description: "Comprehensive project scan including all hidden files, config, and structure"
---

# /scan-project

**Usage**  
Type `/scan-project` for a complete overview of your project structure, including all hidden files and configurations.

**What it scans**  
- Project root structure
- All hidden files and directories (.*) 
- Configuration files across all subdirectories
- Package management files
- IDE/editor configurations
- Build and deployment configs
- Testing configurations
- Documentation files

**Dynamic Discovery**  
This command automatically finds:
- New hidden files as they're added
- Nested configuration directories
- Tool-specific config files
- Environment-specific settings

**Output Sections**  
1. **Project Overview** - Main structure and purpose
2. **Hidden Files** - All .* files with brief descriptions
3. **Configuration Hierarchy** - How configs relate to each other
4. **Development Tools** - IDE, build, test, deploy configs
5. **Dependencies** - Package files and lock files

**Example Output**  
```
/scan-project

📁 PROJECT STRUCTURE
├── .cursor/ - IDE rules and preferences
├── .devcontainer/ - Development environment
├── .github/ - CI/CD workflows
├── src/ - Application source code
└── server/ - Backend API code

🔧 CONFIGURATION FILES
- .nvmrc: Node.js 20
- package.json: React + Express stack
- tsconfig.json: TypeScript ES2022 target
```

**When to use**  
- Project onboarding
- Before major refactoring
- Understanding project architecture
- Debugging environment issues
- Preparing documentation 