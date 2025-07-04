think
Create a new React component **$ARGUMENTS** with TypeScript.

Steps:

1. Determine component location based on type:

   - UI components: `components/ui/`
   - Domain components: `components/[domain]/`
   - Shared components: `components/shared/`

2. Create component file with:

   ```typescript
   /**
    * Brief description of component purpose
    */
   interface ComponentNameProps {
     // Props with JSDoc comments
   }

   /**
    * Component description
    * @param props - Component props
    */
   export function ComponentName({ ...props }: ComponentNameProps) {
     return (
       // Implementation
     );
   }
   ```

3. If needed, create accompanying:

   - `component-name.test.tsx` for tests
   - `use-component-name.ts` for custom hooks
   - Update barrel exports if applicable

4. Run `/lint:all` to ensure code quality

Return CREATED with file paths.
