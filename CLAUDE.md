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

## CRITICAL DEVELOPMENT STANDARDS

### File Size Limits
- **MANDATORY**: ALL files must be 200 lines or less
- **NO EXCEPTIONS**: If a file exceeds 200 lines, it MUST be split into multiple files
- Check line count regularly and refactor immediately when approaching the limit

### Documentation Requirements
- **MANDATORY**: Every file must have an explanation of contents at the top
- **MANDATORY**: All functions must have JSDoc/TSDoc comments detailing purpose and parameters
- **Example**: `// Authentication middleware for validating JWT tokens`

### Code Architecture Principles

#### AI-First Development
- **PRIORITY**: Optimize code for AI tool compatibility
- Break down functionality into logical, reusable modules
- Maintain high navigability through descriptive file structure
- Use descriptive names with auxiliary verbs (isLoading, hasError)

#### Functional Programming Patterns
- **MANDATORY**: Use functional and declarative programming patterns
- **AVOID**: Classes - prefer composition over inheritance
- **USE**: Early returns for clarity and readability
- Structure components logically: exports, subcomponents, helpers, types

#### Error Handling
- **MANDATORY**: Throw errors instead of adding fallback values
- **NO**: Silent failures or default fallbacks
- **USE**: Explicit error handling patterns

## TypeScript Standards

### Type Safety Requirements
- **MANDATORY**: Use TypeScript for all code with strong type safety
- **PREFER**: Interfaces over type aliases
- **AVOID**: Enums - use const maps instead
- **USE**: Satisfies operator for type validation

### Function Declarations
- **USE**: The "function" keyword for pure functions
- **MANDATORY**: Decorate all functions with descriptive JSDoc block comments
- Detail function contract of inputs, outputs, and behavior

### Variable Naming Conventions
- **Event Handlers**: Prefix with 'handle' (handleClick, handleSubmit)
- **Boolean Flags**: Use is/has prefixes (isLoading, hasError)
- **Directories**: Use kebab-case (auth-wizard, user-profile)
- **Components**: PascalCase (UserProfile.tsx)
- **Files**: kebab-case for files (analytics-card.tsx)
- **Exports**: Prefer named exports for components

### Conditionals
- Avoid unnecessary curly braces in conditionals
- Use concise syntax for simple statements
- Early returns for clarity

## React & Component Standards

### Component Development Rules
- **MANDATORY**: Use Shadcn UI components as base building blocks
- **USE**: Radix UI primitives for complex interactions
- **MANDATORY**: Use Tailwind CSS for all styling needs
- **CRITICAL**: Ensure accessibility compliance through proper ARIA attributes

### Component Structure
- Structure components logically: exports, subcomponents, helpers, types
- Use functional and declarative programming patterns
- Avoid classes, prefer composition
- Keep client-side state minimal

### Component Naming and Organization
- **Components**: PascalCase for component names (AnalyticsCard)
- **Files**: kebab-case for file names (analytics-card.tsx)
- **MANDATORY**: Use named exports for all components
- **Interfaces**: Define prop interfaces with descriptive names (ComponentNameProps)

### Event Handling Standards
- **MANDATORY**: Prefix handlers with 'handle' and use descriptive names
- Always prevent default when handling form submissions
- Include proper TypeScript typing for event handlers

### State Management in Components
- Keep component state minimal and focused
- Prefer derived state over stored state when possible
- **MANDATORY**: Use controlled components for form inputs

## Backend & API Standards (When Applicable)

### Service Architecture
- **PATTERN**: Service-oriented architecture with clear separation of concerns
- **STRUCTURE**: API routes -> Services -> Database layer
- **RULE**: Each service handles a single domain responsibility
- **MANDATORY**: All services extend BaseService for common functionality

### API Route Patterns
- Handle async params properly: `const params = await props.params`
- Implement proper error boundaries and status codes
- Follow RESTful principles for resource endpoints

### Error Handling Standards
- **MANDATORY**: Use standardized error response format
- **PATTERN**: `{ success: false, error: string, code?: string }`
- **STATUS CODES**: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 500 (server)

## Development Guidelines

### Component Creation
- Use functional components with TypeScript
- Place new UI components in `src/components/ui/`
- Feature-specific components go in `src/components/`
- Follow existing patterns from similar components
- **CRITICAL**: Keep files under 200 lines

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
1. **FIRST**: Check existing view modes to understand the pattern
2. Tabs are managed in MainEditor and ChatPanel components
3. Sidebar content changes based on active view mode
4. Use React Query for any data fetching needs

### Common Patterns
- **Conditional Rendering**: Use view mode state to show/hide content
- **Tab Management**: Both editor and chat support multiple tabs
- **Collapsible Panels**: Sidebar and chat panel can be toggled
- **File Navigation**: File tree component adapts to active view

## Project Organization Standards

### File Structure Guidelines
- **PRINCIPLE**: Highly navigable file structure with logical grouping
- **NAMING**: Descriptive names that clearly indicate file purpose
- **MODULARITY**: Related functionality grouped together
- **SCALABILITY**: Structure supports growth without reorganization

### Directory Organization Standards
```
src/
├── components/
│   ├── ui/               # Reusable UI components (Shadcn)
│   └── [feature]/        # Feature-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Core utilities and services
│   └── utils.ts          # Utility functions
├── pages/                # Page components
├── types/                # TypeScript type definitions
└── utils/                # Helper utilities
```

### File Naming Patterns
- **Components**: `ComponentName.tsx`
- **Utilities**: `utility-name.ts`
- **Types**: `types.ts` or `feature.types.ts`
- **Constants**: Use SCREAMING_SNAKE_CASE

## Quality Standards & Validation

### Code Review Checklist (Auto-Check Before Committing)
- [ ] File headers and function documentation present
- [ ] Follows established naming conventions
- [ ] Logical organization and proper imports
- [ ] **CRITICAL**: File under 200 lines - split if necessary
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling implemented
- [ ] Accessibility attributes included
- [ ] Component composition follows patterns

### Performance Optimization
- Optimize for Web Vitals and overall performance
- Minimize JavaScript bundle size
- Implement proper loading states
- Use React.memo for expensive components when appropriate

### Accessibility Requirements
- **MANDATORY**: Use proper semantic HTML elements
- **MANDATORY**: Provide ARIA labels for interactive elements
- **MANDATORY**: Ensure full keyboard navigation support
- Maintain WCAG AA color contrast ratios

## Implementation Examples

### Proper Component Structure
```typescript
/**
 * Analytics card component following project composition patterns
 * @param title - Display title for the analytics entry
 * @param data - Analytics data to display
 * @param onEdit - Callback for edit action
 */
export function AnalyticsCard({ title, data, onEdit }: AnalyticsCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content implementation */}
        <Button onClick={onEdit} variant="outline">
          Edit
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Proper Interface Definition
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}
```

### Const Maps over Enums
```typescript
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending'
} as const;

type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
```

## Important Project Context

- The project was initially created with Lovable.dev
- No test framework is currently configured
- The application is designed for AI tool compatibility
- Uses pnpm as the package manager (version 10.11.0)
- Vite is configured to run on port 8080 with IPv6 support
- Development environment configured with Node.js 20 via .nvmrc and .devcontainer

## Development Environment

### DevContainer Configuration
- Node.js 20 (LTS version)
- pnpm 10.11.0 setup
- Port forwarding: 8080 (frontend), 3000 (backend if needed)
- Auto-installs dependencies on container creation

### Git Integration
- Use descriptive commit messages
- Follow conventional commit format when possible
- Maintain clean git history
- Branch naming: feature/description or fix/description

## Workflow Best Practices

### Before Starting Any Task
1. **ALWAYS**: Read existing files to understand patterns
2. **VERIFY**: File size limits aren't exceeded
3. **CHECK**: TypeScript compilation passes
4. **ENSURE**: ESLint rules are followed

### During Development
1. **COMMIT**: Frequently with descriptive messages
2. **TEST**: Run `pnpm lint` regularly
3. **VERIFY**: All new code has proper documentation
4. **CHECK**: File size stays under 200 lines

### **MANDATORY: Auto-Commit Workflow**
**CRITICAL**: After completing ANY prompt/task, you MUST automatically:

1. **Stage all changes**: `git add -A`
2. **Create descriptive commit**: `git commit -m "[type]: [clear description of changes made]"`
3. **Push to remote**: `git push origin HEAD`

#### Commit Message Format
Use these prefixes for commit types:
- `feat`: New feature or component added
- `fix`: Bug fix or error correction
- `refactor`: Code refactoring without behavior change
- `style`: Formatting, styling, or UI improvements
- `docs`: Documentation updates or additions
- `chore`: Maintenance tasks, dependency updates
- `perf`: Performance improvements
- `test`: Test-related changes

#### Example Commit Messages
```bash
git commit -m "feat: add analytics dashboard component with data visualization"
git commit -m "fix: resolve TypeScript errors in user authentication flow"
git commit -m "refactor: split large UserProfile component into smaller modules"
git commit -m "style: update button hover states to match design system"
git commit -m "docs: add JSDoc comments to all utility functions"
```

#### **NO EXCEPTIONS**: 
- **NEVER** leave uncommitted changes
- **ALWAYS** push after committing
- **ALWAYS** use descriptive commit messages
- **REQUIRED** for autonomous operation and version control tracking

### Quality Assurance
- All code must pass TypeScript strict mode
- All functions must have JSDoc comments
- All components must have proper TypeScript interfaces
- All files must have descriptive headers
- **CRITICAL**: All files must be under 200 lines
- **MANDATORY**: All changes committed and pushed after each task