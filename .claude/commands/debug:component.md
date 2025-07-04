think
Debug the React component **$ARGUMENTS**.

Steps:

1. Locate the component file
2. Add debugging helpers:

   ```typescript
   // Temporary debug logging
   console.log("[ComponentName] Props:", props);
   console.log("[ComponentName] State:", state);

   // Add development-only helpers
   if (process.env.NODE_ENV === "development") {
     useEffect(() => {
       console.log("[ComponentName] Mounted");
       return () => console.log("[ComponentName] Unmounted");
     }, []);
   }
   ```

3. Check for common issues:

   - Missing dependencies in useEffect
   - Infinite re-renders
   - Prop type mismatches
   - State update batching issues

4. Add error boundaries if needed:

   ```typescript
   <ErrorBoundary fallback={<ErrorFallback />}>
     <Component />
   </ErrorBoundary>
   ```

5. Run the app and check browser console
6. Remove debug code when fixed

Return DEBUG_COMPLETE with findings.
