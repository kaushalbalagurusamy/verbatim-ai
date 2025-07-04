think harder
Act as the _Integrator agent_.

1. Checkout branch `integration` from `main`.
2. For each feature branch listed below, run:
   ```bash
   git merge --no-commit $BRANCH
   ```
   Resolve conflicts in favor of newer code unless tests say otherwise.
3. After each merge:
   - Run `/lint:all`
   - Run `/test:all`
4. If both commands return OK, `git commit -m "Merge $BRANCH"`; else abort and fix.
5. When all branches merged cleanly:
   ```bash
   git push -u origin integration
   gh pr create -t "Integration PR" -b "Merged branches: $ARGUMENTS"
   ```

Return PR_CREATED with link, or FAIL with details.
Branches to integrate: $ARGUMENTS
