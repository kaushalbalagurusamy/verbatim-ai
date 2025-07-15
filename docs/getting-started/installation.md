# Installation Guide

This comprehensive guide covers everything you need to install and set up Verbatim AI for development or production use.

## Prerequisites

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Required Software
- **Node.js**: Version 20.0.0 or higher
- **Package Manager**: pnpm 10.11.0+ (recommended), npm 7+, or yarn 1.22+
- **Git**: For cloning the repository

## Installation Steps

### Step 1: Install Node.js

#### Windows
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

#### macOS
Using Homebrew:
```bash
brew install node
```

Or download from [nodejs.org](https://nodejs.org/)

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install pnpm (Recommended)

```bash
# Using npm
npm install -g pnpm

# Or using corepack (comes with Node.js 16.9+)
corepack enable
corepack prepare pnpm@latest --activate

# Verify installation
pnpm --version
```

### Step 3: Clone the Repository

```bash
# Using HTTPS
git clone https://github.com/your-org/verbatim-ai.git

# Or using SSH
git clone git@github.com:your-org/verbatim-ai.git

# Navigate to project directory
cd verbatim-ai
```

### Step 4: Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

### Step 5: Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit with your preferred editor
nano .env.local
```

Configure the following variables:
```env
# Application Settings
VITE_APP_NAME="Verbatim AI"
VITE_APP_PORT=8080

# AI Configuration (if using external AI services)
VITE_AI_API_KEY=your_api_key_here
VITE_AI_MODEL=gpt-4

# Optional: Analytics
VITE_ANALYTICS_ID=your_analytics_id
```

### Step 6: Start Development Server

```bash
# Start the development server
pnpm dev

# The application will be available at:
# http://localhost:8080
```

## Development Environment Setup

### Using VS Code (Recommended)

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install recommended extensions:
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features
   - Tailwind CSS IntelliSense

3. Open the project:
   ```bash
   code .
   ```

### Using DevContainers

For a consistent development environment:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install VS Code [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open project in VS Code
4. Click "Reopen in Container" when prompted

The DevContainer includes:
- Node.js 20
- pnpm 10.11.0
- All project dependencies
- Configured ports and environment

### Using Other Editors

The project works with any editor. Ensure you have TypeScript support, ESLint integration, and Prettier formatting.

## Production Deployment

### Building for Production

```bash
# Create optimized production build
pnpm build

# Files will be in the 'dist' directory
ls -la dist/
```

### Deployment Options

#### Static Hosting (Netlify, Vercel, GitHub Pages)
1. Build the project
2. Deploy the `dist` folder
3. Configure redirects for SPA routing

#### Docker Deployment
```bash
docker build -t verbatim-ai .
docker run -p 8080:8080 verbatim-ai
```

#### Traditional Web Server
Configure your web server to serve files from `dist` directory and redirect all routes to `index.html` for SPA routing.

## Verification Steps

After installation, verify everything works:

1. **Check the homepage loads**: http://localhost:8080
2. **Test file creation**: Create a new document
3. **Verify AI chat**: Send a message in the chat panel
4. **Check console**: No errors in browser console
5. **Run linter**: `pnpm lint` should pass

## Troubleshooting

Having issues? Check our comprehensive [Troubleshooting Guide](./troubleshooting.md) for solutions to common problems.

## Next Steps

Installation complete! Now follow the [Quickstart Guide](./quickstart.md) to learn basic usage and start building with Verbatim AI!