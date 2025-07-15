# Verbatim AI

A powerful document editor with integrated AI capabilities, built for modern workflows.

## 🚀 Overview

Verbatim AI is a React-based web application that combines the familiarity of a VS Code-inspired interface with advanced document management and AI-powered features. It provides a seamless environment for creating, editing, and analyzing documents with real-time AI assistance.

## ✨ Key Features

- **📝 Rich Document Editor** - Full-featured text editing with formatting tools
- **🤖 AI Chat Integration** - Built-in AI assistant for document analysis and writing help
- **📁 Smart File Management** - Organized file tree with search and navigation
- **📊 Analytics Dashboard** - Track document metrics and insights
- **🎙️ Recording Capabilities** - Integrated audio recording for notes and transcriptions
- **🎨 VS Code-Inspired UI** - Familiar dark theme with customizable panels
- **⚡ Real-time Collaboration** - Live updates and synchronization
- **🔍 Advanced Search** - Quick file and content discovery

## 📸 Screenshots

<details>
<summary>View Application Screenshots</summary>

### Main Editor Interface
*[Screenshot: Three-panel layout with sidebar, editor, and AI chat]*

### Document Management
*[Screenshot: File tree and document organization]*

### AI Assistant
*[Screenshot: AI-powered chat panel in action]*

</details>

## 🏃 Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 10.11.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/verbatim-ai.git
cd verbatim-ai

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:8080`

### Development Commands

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linting
pnpm lint
```

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + Shadcn/ui components
- **UI Components**: Radix UI primitives
- **State Management**: React hooks + React Query
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Code Quality**: ESLint + TypeScript strict mode

## 📚 Documentation

For detailed documentation, please refer to:

- [CLAUDE.md](./CLAUDE.md) - AI assistant integration guide
- [Architecture Guide](#architecture) - System design and patterns
- [API Reference](#) - Coming soon

## 🏗️ Architecture

Verbatim AI follows a modular, component-based architecture:

```
src/
├── components/       # React components
│   ├── ui/          # Reusable UI components (Shadcn)
│   └── ...          # Feature-specific components
├── pages/           # Route pages
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
└── types/           # TypeScript definitions
```

### View Modes

The application supports four distinct operational modes:

1. **Document View** - Primary editing interface
2. **Pen View** - Analytics and note-taking
3. **Source View** - Argument and source management
4. **Recordings View** - Audio recording and transcription

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow our coding standards (see CLAUDE.md)
4. Ensure all files are under 200 lines
5. Add proper documentation
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards

- TypeScript strict mode enabled
- Functional components with hooks
- Comprehensive JSDoc comments
- File size limit: 200 lines max
- Tailwind CSS for styling

## 🔧 Development Environment

### Using DevContainers

This project includes DevContainer configuration for consistent development:

```bash
# Open in VS Code with Dev Containers extension
# Click "Reopen in Container" when prompted
# Dependencies will be installed automatically
```

### Manual Setup

```bash
# Use the correct Node version
nvm use

# Install dependencies
pnpm install

# Start development
pnpm dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Initially scaffolded with [Lovable](https://lovable.dev)

---

<p align="center">
  Made with ❤️ by the Verbatim AI team
</p>