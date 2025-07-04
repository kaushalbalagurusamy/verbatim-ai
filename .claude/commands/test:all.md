Execute the full test suite (`npm test` or `pnpm test`).  
If failures occur:

1. Summarize failing cases
2. Fix code (not tests) to make them pass
3. Re-run tests
   Loop until green, then commit with "tests: green".

Return OK when all tests pass.

For this Next.js project:

- Run: `npm test` (or `npm run test:ci` for CI mode)
- If using Jest: `npm test -- --coverage` for coverage report
- Check for TypeScript errors: `npm run type-check` or `tsc --noEmit`
