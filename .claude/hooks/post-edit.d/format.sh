#!/bin/bash
# Post-edit hook for auto-formatting in Next.js/TypeScript project

# Check if file exists
if [ -z "$CLAUDE_FILE" ] || [ ! -f "$CLAUDE_FILE" ]; then
  exit 0
fi

# Format with Prettier if it's a supported file type
if [[ "$CLAUDE_FILE" =~ \.(js|jsx|ts|tsx|json|md|css|scss)$ ]]; then
  npx prettier --write "$CLAUDE_FILE" 2>/dev/null || true
fi

# Run ESLint fix for TypeScript/JavaScript files
if [[ "$CLAUDE_FILE" =~ \.(js|jsx|ts|tsx)$ ]]; then
  npx eslint --fix "$CLAUDE_FILE" 2>/dev/null || true
fi

# Format Go files if any exist in the project
if [[ "$CLAUDE_FILE" =~ \.go$ ]]; then
  gofmt -w "$CLAUDE_FILE" 2>/dev/null || true
fi

exit 0 