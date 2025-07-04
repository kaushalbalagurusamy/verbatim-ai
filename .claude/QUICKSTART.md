# Claude Commands Quick Start Guide

## Getting Started

1. **Verify Installation**

   - Commands are in `.claude/commands/`
   - Post-edit hook is executable: `chmod +x .claude/hooks/post-edit.d/format.sh`

2. **Basic Workflow Example**

   ```bash
   # Start with planning
   /plan:decompose Add user authentication with JWT tokens

   # Response: "Ready to spawn 3 sub-agents? Respond YES to continue."
   YES

   # Spawn agents for each task
   /spawn:agent auth-middleware
   /spawn:agent login-api
   /spawn:agent user-context

   # Lock shared files if needed
   /lock lib/types/user.types.ts

   # After development, integrate
   /integrate auth-middleware login-api user-context
   ```

## Common Scenarios

### Adding a New Feature

1. **Plan the feature**

   ```
   /plan:decompose Create analytics dashboard with real-time updates
   ```

2. **Create components**

   ```
   /component:create AnalyticsDashboard
   /component:create RealtimeChart
   ```

3. **Create backend service**

   ```
   /service:create analytics
   ```

4. **Optimize performance**
   ```
   /perf:optimize AnalyticsDashboard
   ```

### Debugging Issues

1. **Component not rendering**

   ```
   /debug:component UserProfile
   ```

2. **Build failing**

   ```
   /build:check
   ```

3. **Performance issues**
   ```
   /perf:optimize overall
   ```

### Maintenance Tasks

1. **Update dependencies**

   ```
   /deps:check
   ```

2. **Fix linting issues**

   ```
   /lint:all
   ```

3. **Run tests**
   ```
   /test:all
   ```

## Command Cheat Sheet

| Task                    | Command             | Example                               |
| ----------------------- | ------------------- | ------------------------------------- |
| Break down complex task | `/plan:decompose`   | `/plan:decompose Build checkout flow` |
| Create component        | `/component:create` | `/component:create CartSummary`       |
| Create service          | `/service:create`   | `/service:create payment`             |
| Fix code quality        | `/lint:all`         | `/lint:all`                           |
| Run tests               | `/test:all`         | `/test:all`                           |
| Check build             | `/build:check`      | `/build:check`                        |
| Optimize performance    | `/perf:optimize`    | `/perf:optimize HomePage`             |
| Update dependencies     | `/deps:check`       | `/deps:check react`                   |
| Debug component         | `/debug:component`  | `/debug:component NavBar`             |
| Merge branches          | `/integrate`        | `/integrate feature-1 feature-2`      |

## Tips

1. **Use thinking modes strategically**

   - Default `think` for most commands
   - `think harder` for integration and complex optimization
   - `ultrathink` for architectural decisions

2. **Combine commands effectively**

   - Always run `/lint:all` after major changes
   - Use `/build:check` before deployment
   - Run `/test:all` after refactoring

3. **Leverage parallelism**

   - Spawn multiple agents for independent tasks
   - Use `/lock` to coordinate shared resources
   - Integrate with `/integrate` for clean merges

4. **Maintain quality**
   - Post-edit hooks auto-format your code
   - Quality gates prevent broken code
   - Performance commands keep app fast

## Need Help?

- Check `.claude/README.md` for detailed documentation
- Review command files directly for implementation details
- Commands use `$ARGUMENTS` placeholder for your input
