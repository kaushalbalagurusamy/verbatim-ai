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

## Terminal Interaction Guidelines

### **CRITICAL: Terminal Execution Protocol**

#### ReAct Pattern Implementation (Thought-Action-Observation-Reflection)

Every terminal interaction MUST follow this structured approach:

1. **THOUGHT**: Analyze what needs to be done
   - Example: "I need to install dependencies before running the server"
2. **ACTION**: Execute ONE single, atomic command
   - Example: `pnpm install`
3. **OBSERVATION**: Wait for complete output and analyze
   - Example: Check for "added X packages" or error messages
4. **REFLECTION**: Determine next step based on observation
   - Example: "Installation successful, now can run dev server"

#### Common Terminal Failures to Avoid

- **Premature Continuation (42% of failures)**: NEVER proceed before command completes
- **Output Misinterpretation (23% of failures)**: Don't assume failure from partial output
- **Path Confusion (18% of failures)**: Always track current directory with `pwd`
- **Command Chaining Issues (12% of failures)**: Avoid `&&` or `;` - execute one command at a time

### **MANDATORY: Command Execution Rules**

#### Single Command Execution

```bash
# ❌ WRONG - Don't chain commands
pnpm install && pnpm dev

# ✅ CORRECT - Execute separately
pnpm install
# (wait for completion)
pnpm dev
```

#### State Tracking Requirements

**Before ANY file operation:**

```bash
pwd                    # Verify current directory
ls -la                 # Check file existence (includes hidden files)
```

**After directory changes:**

```bash
cd src/components
pwd                    # ALWAYS confirm location after cd
```

**Environment verification:**

```bash
echo $SHELL           # Check shell type
which pnpm            # Verify command availability
echo $PATH            # Check PATH if command not found
```

### **Shell State Management**

#### Working Directory Awareness

- **ALWAYS** run `pwd` after `cd` commands
- **NEVER** assume you're in a specific directory
- **VERIFY** location before file operations

#### Process Management

**Long-running processes** (dev servers, watchers):

```bash
# These run indefinitely - don't wait for completion
pnpm dev              # Development server
npm run watch         # File watchers
docker-compose up     # Container services

# Check if running (in another terminal):
lsof -i :8080         # Check port usage
ps aux | grep node    # Find Node processes
```

**Background execution:**

- Use `&` suffix for Unix/Mac: `pnpm dev &`
- Use separate terminal for Windows
- Track PID for later termination

### **Error Recovery Strategies**

#### Permission Errors

```bash
# Detection: "Permission denied", "EACCES"
ls -la file.txt       # Check ownership
chmod +x script.sh    # Make executable if needed
```

#### Port Conflicts

```bash
# Detection: "EADDRINUSE", "port already in use"
lsof -i :8080         # Find process using port (Unix/Mac)
netstat -ano | findstr :8080  # Windows equivalent
kill -9 [PID]         # Terminate process if needed
```

#### Command Not Found

```bash
# Detection: "command not found", "not recognized"
which [command]       # Check if installed (Unix/Mac)
where [command]       # Windows equivalent
echo $PATH            # Verify PATH includes tool location
```

### **Platform-Specific Commands**

#### Cross-Platform Alternatives

| Purpose           | Unix/Mac       | Windows            | Notes                  |
| ----------------- | -------------- | ------------------ | ---------------------- |
| List all files    | `ls -la`       | `dir /a`           | Includes hidden files  |
| Show file content | `cat file.txt` | `type file.txt`    | Display text files     |
| Find text         | `grep pattern` | `findstr pattern`  | Search in files        |
| Remove directory  | `rm -rf dir`   | `rmdir /s /q dir`  | Recursive deletion     |
| Check processes   | `ps aux`       | `tasklist`         | List running processes |
| Kill process      | `kill -9 PID`  | `taskkill /F /PID` | Force terminate        |

#### Windows PowerShell Specific

- **NO** `&&` operator - use `;` or separate commands
- **Check** execution policy: `Get-ExecutionPolicy`
- **Use** forward slashes `/` for paths when possible

### **Output Interpretation**

#### Success Indicators

- Exit code 0 (check with `echo $?` on Unix or `echo %ERRORLEVEL%` on Windows)
- Expected output patterns (e.g., "Server running on port 8080")
- No error messages in output
- Expected files/directories created

#### Partial Output Handling

- **DON'T** assume failure if output is truncated
- **WAIT** for command prompt to return
- **CHECK** exit status after completion

### **Safety Protocols**

#### Dangerous Commands - REQUIRE EXPLICIT CONFIRMATION

- `rm -rf /` or any root-level deletion
- `format` or disk formatting commands
- Database drops or destructive migrations
- Any command with sudo/admin privileges

#### Credential Handling

- **NEVER** echo passwords or API keys
- **USE** environment variables: `export API_KEY=xxx`
- **READ** from `.env` files
- **AVOID** committing secrets

### **Terminal Best Practices Checklist**

Before executing commands:

- [ ] Current directory verified with `pwd`
- [ ] Required files exist (checked with `ls`)
- [ ] Command available (`which`/`where`)
- [ ] No conflicting processes on required ports

During execution:

- [ ] Execute ONE command at a time
- [ ] Wait for COMPLETE output
- [ ] Check exit status
- [ ] Verify expected results

After execution:

- [ ] Expected files/services created
- [ ] No error logs generated
- [ ] State changes confirmed
- [ ] Clean up temporary files

### **DevContainer Terminal Considerations**

When working in the DevContainer:

- Container starts in `/workspace` directory
- Node.js 20 and pnpm 10.11.0 are pre-installed
- Port 8080 is forwarded for development server
- Use `ls -la` to see all project files including hidden
- Check container logs if services fail to start

## Custom Commands for Enhanced Capabilities

Claude Code has access to custom commands in `.claude/commands/` that enhance terminal interaction:

### Available Commands

#### `/show-hidden`

Shows all hidden files and their contents in the project. Useful for understanding configuration.

#### `/check-logs [type]`

Find and analyze various log files:

- Application logs, error traces, build logs
- Automatic error pattern detection
- Debugging suggestions based on errors found

#### `/process-status [action]`

Monitor and manage running processes:

- Check what's running on specific ports
- View exit codes and understand failures
- Clean up zombie processes

#### `/env-state [component]`

Verify environment configuration:

- Check PATH and tool availability
- Verify Node/npm/pnpm versions
- Detect platform and architecture

#### `/terminal-state [action]`

Track terminal execution context:

- Maintain command history with success/failure
- Prevent "wrong directory" errors
- Follow ReAct pattern automatically

#### `/debug-mode [on|off]`

Enable verbose debugging output:

- Add verbose flags automatically
- Trace command execution step-by-step
- Enhanced error information

#### `/safe-execute [command]`

Run commands with safety validations:

- Prevent destructive operations
- Check prerequisites before execution
- Suggest safer alternatives

### Using Custom Commands

These commands help prevent common terminal failures and provide better context awareness. Use them when:

- Debugging issues: `/check-logs error`
- Before starting servers: `/process-status check 8080`
- Verifying setup: `/env-state`
- Tracking state: `/terminal-state`
- Troubleshooting: `/debug-mode on`

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
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
} as const;

type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
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
