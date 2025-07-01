---
name: show-hidden
description: "Show all hidden files and their contents in the project"
---

# /show-hidden

**Usage**  
Type `/show-hidden` to see all hidden configuration files and their contents in your project.

**What it does**  
- Automatically discovers all hidden files (starting with .)
- Shows file structure and contents
- Filters out common ignore patterns (.git/, node_modules/, etc.)
- Displays content in a readable format

**Example**  
```
/show-hidden
→ Lists .eslintrc.js, .gitignore, .nvmrc, .devcontainer/, .cursor/, etc.
→ Shows content of each file for context
```

**Useful for**  
- Understanding project configuration
- Debugging development environment issues
- Reviewing tooling setup
- Onboarding new team members 