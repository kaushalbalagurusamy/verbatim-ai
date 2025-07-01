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

### Using the Dev Container

1. **With VS Code**:
   - Install the "Dev Containers" extension
   - Open the project folder
   - Click "Reopen in Container" when prompted
   - Wait for the container to build and initialize

2. **With GitHub Codespaces**:
   - The dev container configuration will be automatically used

3. **With Docker CLI**:
   ```bash
   # Build and run the dev container
   docker build -t verbatim-ai-dev .devcontainer/
   docker run -it -v $(pwd):/workspace verbatim-ai-dev
   ```

### Troubleshooting

- **Container build fails**: Ensure Docker is running and you have sufficient disk space
- **Network issues**: The firewall restricts access to allowed domains only (GitHub, npm, Anthropic)
- **Permission errors**: The container runs as the `node` user for security

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
