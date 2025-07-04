think
Handle terminal execution for **$ARGUMENTS** with proper timeout and completion detection.

Terminal Execution Rules:

1. Set reasonable timeouts (5s for most commands, 30s for builds)
2. Recognize partial output as potential success
3. Don't wait indefinitely for prompts
4. Move forward if command appears to have started

Success Indicators:

- Process started message
- Server running on port
- Build/compile started
- No error in first 3 seconds

For long-running processes:

```bash
# Start in background
npm run dev &

# Check if started
sleep 3 && lsof -i :3000

# Continue with next task
```

For commands that might hang:

```bash
# Use timeout wrapper
timeout 5s npm install || echo "Command completed or timed out"

# Check exit code
if [ $? -eq 124 ]; then
  echo "Command timed out but may have succeeded"
fi
```

Best Practices:

- Assume success if no immediate error
- Use background execution for dev servers
- Set explicit timeouts for CI commands
- Check process/port instead of waiting for output

Return HANDLED with execution summary.
