think
Manage database migrations for **$ARGUMENTS** (create/run/rollback).

Steps for creating a new migration:

1. Generate migration file with timestamp:

   ```bash
   # Example: db/migrations/20240101120000_add_user_roles.sql
   ```

2. Write migration with up/down sections:

   ```sql
   -- UP
   CREATE TABLE IF NOT EXISTS user_roles (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL,
     role VARCHAR(50) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- DOWN
   DROP TABLE IF EXISTS user_roles;
   ```

3. Test migration locally:

   - Run up migration
   - Verify schema changes
   - Test rollback
   - Re-run up migration

4. Update TypeScript types to match schema

5. Run `/test:all` to ensure no breaks

For running migrations:

- Development: Apply all pending migrations
- Production: Review changes first, then apply
- Rollback: Only if safe and necessary

Return MIGRATION_COMPLETE with summary.
