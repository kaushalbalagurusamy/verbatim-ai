# GEMINI.md

This file provides foundational mandates and project-specific context for Gemini CLI.

## 🚀 Project Overview
Verbatim AI is a React-based document editor inspired by the VS Code interface, featuring AI chat integration and a specialized "Flow" grid for competitive debate.

## ⚠️ Critical Mandates (Precedence: High)
- **File Size Limit:** Every file **MUST** be 200 lines or less. No exceptions. Refactor immediately if a file exceeds this.
- **Documentation:** Every file must have a header comment. All functions require JSDoc/TSDoc comments.
- **TypeScript:** Strict mode is enabled. Avoid `any` at all costs.
- **Commit Workflow:** Automatically stage all changes (`git add -A`) and commit with a clear prefix (e.g., `feat:`, `fix:`, `chore:`) after every task.

## 🛠️ Tech Stack & Commands
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui.
- **Backend:** Node.js (Express) in `server/src`.
- **Package Manager:** pnpm 10.11.0.

```bash
pnpm install    # Install dependencies
pnpm dev        # Start frontend + backend
pnpm build      # Production build
pnpm lint       # Run ESLint
pnpm test       # Run Vitest
pnpm test:e2e   # Run Playwright
```

## 🎨 Architectural Patterns
- **Three-Panel Layout:** Sidebar (navigation), MainEditor (tabs), ChatPanel (AI).
- **Service-Oriented:** Logic is split into specialized services (e.g., `InputHandlerService`, `DocumentModel`).
- **State Management:** Local React state + TanStack Query for server data.
- **Tab/Document Sync:** Managed via `src/lib/tab-manager.ts` and `src/lib/document-store.ts`.

## 📜 Coding Standards
- **Naming:** PascalCase for components, camelCase for functions/variables, kebab-case for directories/files.
- **Patterns:** Prefer functional components and Hooks over classes.
- **Style:** Utilize the `cn()` utility for Tailwind class merging.
- **Exports:** Use named exports for all components and utilities.

## 📁 Key Directories
- `src/editor-v2/`: Hardened editor implementation (Primary).
- `src/components/ui/`: Reusable Shadcn/ui primitives.
- `docs/history/`: Historical milestone summaries and performance audits.
