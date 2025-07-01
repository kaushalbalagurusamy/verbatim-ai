---
name: cursor-rules
description: "Show and manage Cursor IDE rules and configuration files"
---

# /cursor-rules

**Usage**  
Type `/cursor-rules` to view all Cursor IDE configurations and rules in your project.

**What it shows**  
- `.cursor/` directory structure and contents
- All `.mdc` rule files with their purposes
- User rules vs project rules
- Rule precedence and conflicts
- IDE settings and preferences

**Rule Categories Covered**  
- Architecture guidelines (001-099)
- Language/framework rules (100-199)
- Domain-specific rules (200-299)
- Workflow rules (300-499)
- Feature-specific rules (500-899)
- Meta-rules (900-999)

**Output Format**  
```
📋 CURSOR CONFIGURATION

.cursor/rules/
├── 001-architecture.mdc - Core architecture patterns
├── 100-typescript.mdc - TypeScript standards  
├── 200-frontend.mdc - React/Next.js best practices
└── 300-backend.mdc - API and service patterns

🎯 ACTIVE RULES
- File size limit: 200 lines max
- TypeScript strict mode required
- Functional programming patterns preferred
```

**Management Actions**  
Use this command to:
- Review current rule configurations
- Identify rule conflicts or gaps
- Plan new rule additions
- Understand coding standards
- Debug IDE behavior

**Best Practices**  
- Review rules before major features
- Update rules when standards change
- Ensure team alignment on practices
- Document rule reasoning and examples 