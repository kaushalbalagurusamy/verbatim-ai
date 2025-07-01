---
name: edit-mode
description: "Toggle editing mode for configuration files - master switch for modifications"
---

# /edit-mode

**Usage**  
Type `/edit-mode [on|off|status]` to control file modification capabilities.

**Commands**  
- `/edit-mode on` - Enable configuration file editing
- `/edit-mode off` - Disable all file modifications (read-only)
- `/edit-mode status` - Show current editing permissions

**When Editing is ON**  
✅ Can modify .cursor/ rules and settings  
✅ Can update .devcontainer/ configurations  
✅ Can change package.json and dependencies  
✅ Can modify TypeScript and build configs  
✅ Can create new Cursor rule files  
✅ Can update project configurations  

**When Editing is OFF**  
❌ All modifications blocked (safety mode)  
✅ Can still read and analyze files  
✅ Can preview proposed changes  
✅ Can scan project structure  
✅ Can show configuration details  

**Safety Features**  
- **Explicit Permission**: Always asks before making changes
- **Preview Mode**: Shows diffs before applying
- **Selective Scope**: Can limit to specific file types
- **Rollback Support**: Maintains change history
- **Validation**: Checks syntax and compatibility

**Status Display**  
```
/edit-mode status

🔧 EDITING MODE: ON
📝 Allowed Operations:
  - Cursor rule modifications
  - Configuration updates
  - Dependency changes
  - Environment adjustments

🛡️ Safety Measures:
  - Preview before apply: ✅
  - Backup references: ✅
  - Syntax validation: ✅
  - Permission prompts: ✅
```

**Integration with Other Commands**  
- `/edit-config` - Requires edit mode to be ON
- `/add-cursor-rule` - Requires edit mode to be ON
- `/update-config` - Requires edit mode to be ON
- `/show-hidden` - Works in any mode (read-only)
- `/scan-project` - Works in any mode (read-only)

**Best Practices**  
- Turn ON when you need to make configuration changes
- Turn OFF when just exploring or analyzing
- Check status before attempting modifications
- Use preview mode to verify changes before applying

**Default State**  
Edit mode starts OFF by default for safety. You must explicitly enable it when you want to make changes. 