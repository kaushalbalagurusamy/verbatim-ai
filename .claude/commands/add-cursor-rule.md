---
name: add-cursor-rule
description: "Add a new Cursor rule file with proper numbering and structure"
---

# /add-cursor-rule

**Usage**  
Type `/add-cursor-rule [category] [name]` to create a new Cursor rule file.

**Categories Available**  
- `arch` (001-099) - Architecture and foundational rules
- `lang` (100-199) - Language and framework specific
- `domain` (200-299) - Domain and application specific  
- `workflow` (300-499) - Development workflow and process
- `feature` (500-899) - Specialized feature and component rules
- `meta` (900-999) - Meta-rules and rule management

**Auto-numbering**  
- Automatically finds next available number in category
- Follows NNN-descriptive-name.mdc format
- Ensures proper precedence ordering
- Prevents number conflicts

**Examples**  
```bash
/add-cursor-rule arch database-patterns
→ Creates 002-database-patterns.mdc

/add-cursor-rule lang react-hooks  
→ Creates 101-react-hooks.mdc

/add-cursor-rule domain analytics-rules
→ Creates 201-analytics-rules.mdc
```

**Rule Template**  
Creates properly formatted .mdc files with:
- Correct YAML frontmatter
- Standard rule structure with JSON annotations
- Implementation examples section
- Validation checklist
- Best practices documentation

**Interactive Process**  
1. Specify category and descriptive name
2. Claude generates proper file number and structure
3. Prompts for rule content and requirements
4. Creates file with complete documentation
5. Updates any related documentation

**Integration**  
- Works with `/cursor-rules` command to show new rules
- Maintains consistency with existing rule format
- Follows project's rule management standards
- Updates rule precedence documentation 