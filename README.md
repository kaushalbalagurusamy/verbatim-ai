# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/f49012d5-16f2-4255-9023-f53e0d26fd28

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/f49012d5-16f2-4255-9023-f53e0d26fd28) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Development with Dev Containers

This project includes a Dev Container configuration that provides a consistent, secure development environment with all necessary tools pre-installed.

### Features

- **Secure Environment**: Network isolation with firewall rules limiting external access
- **Pre-configured Tools**: Node.js 20, pnpm, Git, and development utilities
- **VS Code Extensions**: ESLint, Prettier, Tailwind CSS IntelliSense, and more
- **Persistent History**: Command history preserved across container sessions
- **Port Forwarding**: Automatic forwarding for development server (port 8080)

### Quick Start

1. **Open in Container**:
   - Install the "Dev Containers" extension in VS Code
   - Open the project folder
   - Click "Reopen in Container" when prompted
   - Wait for the container to build (this should complete successfully now!)

2. **After Container is Ready**:
   ```bash
   # The container will automatically run: pnpm install
   # Then you can start development immediately:
   pnpm dev
   
   # Optional: Enable secure firewall (for Claude Code safety):
   sudo /usr/local/bin/init-firewall.sh
   ```

### Authentication Setup

**You WILL need to re-authenticate in the container:**

#### GitHub CLI Authentication
```bash
# Login to GitHub CLI inside the container
gh auth login
# Follow the prompts to authenticate
```

#### Claude Code Authentication
```bash
# Set up Claude Code with your API key
claude-code auth login
# Or set environment variable:
export CLAUDE_API_KEY="your-api-key-here"
```

### Fixed Issues

- **Container Setup**: Now separates dependency installation from firewall setup
- **Network Access**: Firewall setup is optional and runs after container is ready
- **Error Handling**: Improved firewall script with timeout and fallback mechanisms
- **Authentication**: Clear guidance on required re-authentication

### Troubleshooting

- **Container build fails**: Ensure Docker is running and you have sufficient disk space
- **"Setting up" hangs**: The fix separates firewall from initial setup - this should resolve the issue
- **Network issues after firewall**: The firewall restricts access to allowed domains only (GitHub, npm, Anthropic)
- **Permission errors**: The container runs as the `node` user for security
- **Authentication required**: You'll need to re-login to GitHub and Claude Code inside the container

### Firewall Details

The optional firewall setup creates a secure environment by:
- ✅ Allowing: GitHub, npm registry, Anthropic API, localhost
- ❌ Blocking: All other external network access
- 🛡️ Perfect for Claude Code "yolo mode" with network restrictions

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/f49012d5-16f2-4255-9023-f53e0d26fd28) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
