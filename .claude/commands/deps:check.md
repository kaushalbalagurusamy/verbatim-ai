Check and update project dependencies for **$ARGUMENTS** (or all if not specified).

Steps:

1. Check for outdated packages:

   ```bash
   npm outdated
   ```

2. For security vulnerabilities:

   ```bash
   npm audit
   ```

3. Update dependencies based on scope:

   - Patch updates: `npm update`
   - Minor updates: `npm install package@latest`
   - Major updates: Review breaking changes first

4. For specific package updates:

   ```bash
   npm install $ARGUMENTS@latest
   ```

5. After updates:

   - Run `/lint:all`
   - Run `/test:all`
   - Check for TypeScript errors: `npm run type-check`

6. Update lock file:
   ```bash
   npm install --package-lock-only
   ```

Return UPDATE_COMPLETE with summary of changes.
