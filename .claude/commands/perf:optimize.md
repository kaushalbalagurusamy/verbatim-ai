think harder
Optimize performance for **$ARGUMENTS** (component/page/overall).

Analysis Phase:

1. Profile current performance:

   - React DevTools Profiler
   - Chrome Performance tab
   - Next.js build analysis

2. Identify bottlenecks:
   - Unnecessary re-renders
   - Large bundle sizes
   - Blocking resources
   - N+1 queries

Optimization Strategies:

For Components:

- Add React.memo() for expensive components
- Use useMemo/useCallback for expensive computations
- Implement virtualization for long lists
- Lazy load with dynamic imports

For Pages:

- Convert to Server Components where possible
- Implement proper data fetching patterns
- Add appropriate cache headers
- Optimize images with next/image

For Bundle Size:

- Tree-shake unused imports
- Code split at route level
- Externalize large dependencies
- Use dynamic imports for heavy components

Implementation:

1. Apply optimizations incrementally
2. Measure impact after each change
3. Run `/build:check` to verify improvements
4. Document performance gains

Return OPTIMIZED with before/after metrics.
