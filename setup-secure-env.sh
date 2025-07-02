#!/bin/bash
# Convenience script for setting up secure development environment

echo "🚀 Verbatim AI - Secure Development Environment Setup"
echo "=================================================="

# Check if we're in a container
if [ ! -f "/.dockerenv" ] && [ "$DEVCONTAINER" != "true" ]; then
    echo "⚠️  This script is designed to run inside the devcontainer"
    echo "   Please open the project in VS Code with Dev Containers extension"
    exit 1
fi

echo "📦 Checking dependencies..."
if ! command -v pnpm >/dev/null 2>&1; then
    echo "❌ pnpm not found - installing dependencies..."
    npm install -g pnpm@10.11.0
fi

if [ ! -d "node_modules" ]; then
    echo "📥 Installing project dependencies..."
    pnpm install
fi

echo "🔑 Authentication Status:"

# Check GitHub authentication
if gh auth status >/dev/null 2>&1; then
    echo "✅ GitHub CLI: Authenticated"
else
    echo "❌ GitHub CLI: Not authenticated"
    echo "   Run: gh auth login"
fi

# Check Claude Code
if command -v claude-code >/dev/null 2>&1; then
    echo "✅ Claude Code: Installed"
    if [ -n "${CLAUDE_API_KEY:-}" ]; then
        echo "✅ Claude API Key: Set"
    else
        echo "❌ Claude API Key: Not set"
        echo "   Run: export CLAUDE_API_KEY='your-key-here'"
    fi
else
    echo "❌ Claude Code: Not found"
fi

echo ""
echo "🛡️ Security Options:"
echo "1. Start development (no firewall) - Standard development mode"
echo "2. Enable secure firewall - Restricted network access for Claude safety"
echo "3. Skip for now"

read -p "Choose option (1-3): " choice

case $choice in
    1)
        echo "🚀 Starting development server..."
        pnpm dev
        ;;
    2)
        echo "🔒 Setting up secure firewall..."
        sudo /usr/local/bin/init-firewall.sh
        echo "🚀 Starting development server..."
        pnpm dev
        ;;
    3)
        echo "✅ Setup complete! Ready for development."
        echo ""
        echo "Next steps:"
        echo "  • Run 'pnpm dev' to start development"
        echo "  • Run 'sudo /usr/local/bin/init-firewall.sh' to enable security"
        echo "  • Run 'gh auth login' if you need GitHub access"
        ;;
    *)
        echo "Invalid option. Run the script again to choose."
        ;;
esac 