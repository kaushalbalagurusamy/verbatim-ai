# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Verbatim AI is a React-based web application with an IDE-like interface for document management, analytics, and AI-powered features. The application uses a VS Code-inspired dark theme and features a three-panel layout with sidebar navigation, main editor, and chat panel.

## Essential Commands

### Development
```bash
# Install dependencies
pnpm install

# Start development server (runs on port 8080)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linting
pnpm lint
```

### Code Quality
- **Linting**: `pnpm lint` - Uses ESLint with TypeScript and React configurations
- **Testing**: No test framework currently configured
- **Type Checking**: TypeScript strict mode is enabled

## Architecture Overview

### Three-Panel Layout Architecture
The application uses a consistent three-panel layout:
1. **Sidebar** (`src/components/Sidebar.tsx`) - Left navigation with file tree and search
2. **MainEditor** (`src/components/MainEditor.tsx`) - Central tabbed editor area
3. **ChatPanel** (`src/components/ChatPanel.tsx`) - Right-side AI chat interface

### View Modes
The application supports four distinct view modes, each with specific functionality:
- **Document View**: Document editing and management
- **Pen View**: Analytics and note-taking
- **Source View**: Arguments and source management
- **Recordings View**: Audio recording functionality

### Component Architecture
```
src/
├── components/
│   ├── ui/          # Shadcn/ui base components (Button, Dialog, etc.)
│   ├── Sidebar.tsx  # Main navigation
│   ├── MainEditor.tsx # Central editor with tabs
│   └── ChatPanel.tsx # AI chat interface
├── pages/
│   └── Index.tsx    # Main application shell
├── hooks/           # Custom React hooks
└── lib/
    └── utils.ts     # Utility functions including cn() for class merging
```

### State Management
- **Local State**: useState for UI interactions
- **Server State**: React Query (TanStack Query) for data fetching
- **Routing**: React Router v6
- **No Global State**: Currently no Redux/Zustand implementation

### UI Component System
The project uses Shadcn/ui components built on Radix UI primitives. All components are in `src/components/ui/` and follow consistent patterns. Use the `cn()` utility from `lib/utils.ts` for conditional class merging.

### Styling Guidelines
- **Framework**: Tailwind CSS with custom color scheme
- **Theme Colors**:
  - Background: `bg-[#1e1e1e]` (main), `bg-[#252526]` (sidebar)
  - Text: `text-[#cccccc]` (primary), `text-[#6a6a6a]` (muted)
  - Accent: `text-[#4fc3f7]` (blue)
  - Borders: `border-[#3c3c3c]`

## Development Guidelines

### Component Creation
- Use functional components with TypeScript
- Place new UI components in `src/components/ui/`
- Feature-specific components go in `src/components/`
- Follow existing patterns from similar components
- Keep files under 200 lines when possible

### Import Patterns
- Use `@/` alias for src directory imports
- Example: `import { Button } from "@/components/ui/button"`

### Code Style
- TypeScript strict mode is enabled
- Use interfaces over type aliases
- Follow ESLint rules (configured in eslint.config.js)
- Component names: PascalCase
- Function names: camelCase
- Directory names: kebab-case

### Adding New Features
1. Check existing view modes to understand the pattern
2. Tabs are managed in MainEditor and ChatPanel components
3. Sidebar content changes based on active view mode
4. Use React Query for any data fetching needs

### Common Patterns
- **Conditional Rendering**: Use view mode state to show/hide content
- **Tab Management**: Both editor and chat support multiple tabs
- **Collapsible Panels**: Sidebar and chat panel can be toggled
- **File Navigation**: File tree component adapts to active view

## Important Notes

- The project was initially created with Lovable.dev
- No test framework is currently configured
- The application is designed for AI tool compatibility
- Uses pnpm as the package manager (version 10.11.0)
- Vite is configured to run on port 8080 with IPv6 support