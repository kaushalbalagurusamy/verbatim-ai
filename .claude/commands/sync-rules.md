---
name: sync-rules
description: "Synchronize Cursor rules with CLAUDE.md and ensure consistency across development standards"
---

# /sync-rules

**Usage**  
Type `/sync-rules` to review and synchronize development standards between Cursor rules and CLAUDE.md.

**What it does**  
- Compares `.cursor/rules/*.mdc` files with `CLAUDE.md` content
- Identifies gaps or inconsistencies between rule systems
- Suggests updates to maintain alignment
- Ensures Claude Code gets consistent guidance

**Synchronization Areas**  
- **File size limits** (200 lines max)
- **Documentation requirements** (JSDoc comments, file headers)
- **TypeScript standards** (interfaces, const maps, naming)
- **Component patterns** (Shadcn UI, naming conventions)
- **Architecture principles** (functional patterns, error handling)
- **Project organization** (directory structure, file naming)

**Output Format**  
Shows comparison between systems and recommendations for alignment:

```
🔄 RULE SYNCHRONIZATION STATUS

✅ ALIGNED RULES:
- File size limits: Both systems enforce 200 line max
- TypeScript standards: Consistent interface requirements

⚠️ INCONSISTENCIES FOUND:
- Cursor rules specify "no enums" but CLAUDE.md doesn't emphasize const maps
- Backend standards in Cursor but limited coverage in CLAUDE.md

🔧 RECOMMENDED UPDATES:
- Add const maps emphasis to CLAUDE.md TypeScript section
- Expand backend standards in CLAUDE.md
```

**When to use**  
- After updating Cursor rules
- When CLAUDE.md feels out of sync
- Before major feature development
- During code review process setup
- When onboarding new team members

**Integration Benefits**  
- **Claude Code Compliance**: CLAUDE.md serves as primary guidance for claude.ai/code
- **Cursor IDE Compliance**: .mdc rules enforce standards in Cursor
- **Team Consistency**: Both systems aligned for all developers
- **AI Tool Optimization**: Both tools get consistent, structured guidance

**Best Practices**  
- Run after any rule changes
- Keep both systems updated together
- Document rationale for any differences
- Test effectiveness with actual coding tasks 