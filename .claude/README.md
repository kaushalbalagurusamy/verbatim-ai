# Claude Command System

This directory contains custom commands for Claude Code to streamline development workflows in this Next.js/TypeScript project.

## Overview

The command system implements a "plan-spawn-work-integrate" pipeline that enables:

- Structured task decomposition
- Parallel development with isolated Git worktrees
- Automated quality checks
- Deterministic integration

## Available Commands

### Planning & Architecture

#### `/plan:decompose [goal]`

Breaks down complex goals into independent, non-overlapping tasks.

- Uses extended thinking for thorough analysis
- Creates numbered checklist with file scopes
- Prevents task collision

Example: `/plan:decompose Build user authentication system`

#### `/mode:ultrathink`

Allocates maximum reasoning budget for complex architectural decisions.

### Development Workflow

#### `/spawn:agent [task-name]`

Creates isolated sub-agent for implementing specific tasks.

- Uses Git worktrees for isolation
- Maintains focused scope
- Enables true parallel development

#### `/lock [files/paths]`

Applies temporary mutex to prevent concurrent edits.

- Prevents merge conflicts
- Coordinates multi-agent work

### Component Development

#### `/component:create [ComponentName]`

Scaffolds new React components with TypeScript.

- Follows project structure conventions
- Includes proper TypeScript interfaces
- Adds JSDoc documentation

Example: `/component:create UserProfileCard`

#### `/debug:component [ComponentName]`

Adds debugging helpers to troubleshoot component issues.

- Lifecycle logging
- State inspection
- Performance profiling

### Backend Development

#### `/service:create [domain]`

Creates new backend service following architecture patterns.

- Extends BaseService
- Includes validation
- Creates corresponding API routes

Example: `/service:create analytics`

### Quality Assurance

#### `/lint:all`

Runs ESLint with auto-fix across the codebase.

- Fixes formatting issues
- Enforces code standards
- Commits fixes automatically

#### `/test:all`

Executes full test suite with coverage.

- Runs Jest tests
- Checks TypeScript types
- Ensures all tests pass before proceeding

#### `/build:check`

Verifies production build readiness.

- Type checking
- Bundle analysis
- Performance metrics
- Lighthouse scores

### Performance

#### `/perf:optimize [target]`

Optimizes performance for components, pages, or overall app.

- Profiles current performance
- Identifies bottlenecks
- Applies optimization strategies
- Measures improvements

### Dependency Management

#### `/deps:check [package]`

Checks and updates project dependencies.

- Security audit
- Version updates
- Breaking change review
- Post-update testing

### Integration

#### `/integrate [branch1 branch2 ...]`

Merges multiple feature branches with quality gates.

- Sequential merging
- Automatic conflict resolution
- Lint and test validation
- Creates integration PR

## Best Practices

### 1. Always Plan First

Start complex features with `/plan:decompose` to ensure clear task boundaries.

### 2. Use Parallel Agents

Spawn multiple agents for independent tasks to maximize efficiency.

### 3. Lock Critical Files

Use `/lock` when multiple agents might edit the same files.

### 4. Maintain Quality Gates

Always run `/lint:all` and `/test:all` before integration.

### 5. Optimize Incrementally

Use `/perf:optimize` regularly to maintain performance standards.

## Post-Edit Hooks

The system includes automatic formatting hooks that run after each file edit:

- Prettier for code formatting
- ESLint for linting fixes
- Supports TypeScript, JavaScript, JSON, Markdown, CSS

## Project-Specific Adaptations

This command system is tailored for:

- Next.js 15 with App Router
- React 19 with Server Components
- TypeScript with strict mode
- Tailwind CSS for styling
- Shadcn UI components

## Troubleshooting

### Command Not Found

Ensure you're in a Claude Code session and commands are in `.claude/commands/`

### Git Worktree Issues

Check that you have sufficient disk space and proper Git permissions

### Build Failures

Run `/build:check` to identify specific issues before deployment

### Performance Degradation

Use `/perf:optimize` to profile and fix performance bottlenecks

## Contributing

When adding new commands:

1. Follow the existing naming convention: `category:action.md`
2. Use appropriate thinking keywords (think, think harder, ultrathink)
3. Include clear step-by-step instructions
4. Add return status indicators
5. Update this README

## Integration with CI/CD

These commands can be integrated into CI/CD pipelines:

- Use `/lint:all` and `/test:all` in pre-commit hooks
- Run `/build:check` before deployments
- Execute `/deps:check` on schedule for security updates
