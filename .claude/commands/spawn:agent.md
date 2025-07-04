think
Create a new sub-agent to implement **$ARGUMENTS**.

Steps:

1. Run: `git worktree add ../$ARGUMENTS $ARGUMENTS`
2. `cd ../$ARGUMENTS`
3. Launch a fresh Claude session here (`claude`)
4. Limit edits to the files listed in the plan for this task.
5. Commit logically-grouped changes with clear messages.
6. When done, print **DONE**.

If any step fails, print **FAIL** and explain.
