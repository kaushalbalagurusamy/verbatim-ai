think
Verify the project is ready for production build.

Steps:

1. Run TypeScript type checking:

   ```bash
   npm run type-check || tsc --noEmit
   ```

2. Build the Next.js application:

   ```bash
   npm run build
   ```

3. Analyze bundle size:

   ```bash
   npm run build -- --analyze
   ```

4. Check for build warnings:

   - Large bundle sizes
   - Missing environment variables
   - Deprecated API usage
   - Unused dependencies

5. Test production build locally:

   ```bash
   npm run start
   ```

6. Run Lighthouse audit on key pages:

   - Performance score > 90
   - Accessibility score > 95
   - SEO score > 90

7. Verify critical features work in production mode

Return BUILD_READY or ISSUES_FOUND with details.
