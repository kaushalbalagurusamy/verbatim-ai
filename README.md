# Verbatim AI

[![CI](https://github.com/kaushalbalagurusamy/verbatim-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/kaushalbalagurusamy/verbatim-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Concurrent low-latency document workspace and controlled-input editor engineered for high-speed speech note-taking, real-time rebuttal generation, visual argument flow mapping, and topical scholarly evidential reinforcement.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 Client Workspace (React 18 + Vite)                |
|                                                                                   |
|  +---------------------+  +----------------------------------+  +--------------+  |
|  |   Left Sidebar      |  |         Central Workspace        |  |  Right Panel |  |
|  | - FileTree          |  |  +----------------------------+  |  | - ChatPanel  |  |
|  | - View Selector     |  |  | Mode 1: EditorV2 (RichDoc) |  |  | - Context AI |  |
|  | - Search & Sources  |  |  | Mode 2: FlowEditor (Graphs)|  |  | - Rewrites   |  |
|  |                     |  |  +----------------------------+  |  |              |  |
|  +----------+----------+  +-----------------+----------------+  +-------+------+  |
+-------------|-------------------------------|---------------------------|---------+
              |                               |                           |
              v                               v                           v
+-----------------------------------------------------------------------------------+
|                         EditorV2 Controlled Input Engine                          |
|                                                                                   |
|  User Input Event -> InputHandlerService -> DocumentModel -> DOMDecoratorService |
|  (beforeinput trap)   (Op Normalization)     (UTF-16 State)   (Span Recycling)   |
+---------------------------------------------+-------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------+
|                        Backend API Server (Node.js Express)                       |
|  - REST endpoints for document persistence, versioning, and project metadata      |
+-----------------------------------------------------------------------------------+
```

---

## Core Capabilities

* **EditorV2 Controlled Input Engine**: Custom rich-text engine intercepting browser `beforeinput` events to enforce deterministic cross-platform editing, UTF-16 code unit offset tracking, and atomic operations.
* **Span Recycling & Virtualized DOM**: Pre-allocated span pools and interval merging algorithm maintaining $< 16\text{ms}$ typing latency on long documents.
* **Multi-View Workspace**:
  * **Document View**: Structured long-form text editing with inline formatting.
  * **Flow View**: Visual node-based mapping for arguments, claims, and logical structure.
  * **Source View**: Citation, cross-reference, and evidence registry.
  * **Recordings View**: Integrated audio dictation and transcript alignment.
* **Context-Aware AI Assistant**: Embedded copilot panel providing real-time synthesis, claim verification, tone adjustments, and document transformations.
* **Performance Budgeting & Testing**: Built-in test harnesses with Vitest, Playwright end-to-end suites, and Lighthouse CI performance auditing.

---

## Repository Structure

```
verbatim-ai/
├── src/
│   ├── components/           # React UI components (Sidebar, TopBar, FileTree, ChatPanel)
│   │   ├── editor/           # Editor UI controls, format bars, and status overlays
│   │   └── ui/               # Radix UI primitive wrappers and styled components
│   ├── editor/               # EditorV2 core engine
│   │   ├── data-structures/  # Document model and tree structures
│   │   ├── formatting/       # Text format definitions and range math
│   │   ├── observers/        # Mutation and viewport observers
│   │   ├── rendering/        # DOM synchronization and span decorators
│   │   ├── selection/        # Selection range and cursor management
│   │   └── services/         # Input handler and document diff emitters
│   ├── pages/                # Route components (Index, NotFound, TestPerformance)
│   ├── hooks/                # Custom React state and event hooks
│   ├── api/                  # Client-side API service connectors
│   └── types/                # TypeScript interface definitions
├── server/                   # Backend Express application
│   └── src/                  # Routes, controllers, and document storage services
├── docs/
│   ├── adr/                  # Architectural Decision Records (ADRs 0001 - 0004)
│   └── architecture/         # Deep dive architecture and design specifications
├── e2e/                      # Playwright end-to-end and performance test specs
├── tests/                    # Vitest unit and integration test suites
├── package.json              # Workspace scripts and dependencies
├── vite.config.ts            # Vite bundler configuration
└── tailwind.config.ts        # Tailwind CSS design system configuration
```

---

## Prerequisites

* **Node.js**: 20.x or higher
* **Package Manager**: `pnpm` (10.x recommended)

---

## Quickstart

### 1. Installation

```bash
git clone https://github.com/kaushalbalagurusamy/verbatim-ai.git
cd verbatim-ai

pnpm install
```

### 2. Environment Configuration

Create your environment configuration from the template:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_PORT` | `3001` | Backend Express server port |
| `PORT` | `3001` | Server listening port |
| `FRONTEND_URL` | `http://localhost:8072` | Allowed CORS origin for Vite dev server |

### 3. Running the Development Server

Start both the Vite frontend client and Express backend server concurrently:

```bash
pnpm dev
```

* **Frontend Client**: `http://localhost:8072`
* **Backend API**: `http://localhost:3001/api`

---

## Testing & Quality Assurance

```bash
# Run unit tests
pnpm test:run

# Run unit tests with coverage
pnpm test:coverage

# Run Playwright end-to-end tests
pnpm test:e2e

# Run performance budget verification
pnpm test:performance

# Run linter
pnpm lint
```

---

## Technical Documentation & ADRs

All core architectural decisions are recorded in [`docs/adr/`](docs/adr/):

* [`docs/adr/0001-controlled-input-editor-architecture.md`](docs/adr/0001-controlled-input-editor-architecture.md) — Controlled Input Editor Architecture (EditorV2)
* [`docs/adr/0002-utf16-block-level-document-model.md`](docs/adr/0002-utf16-block-level-document-model.md) — UTF-16 Block-Level Document Model
* [`docs/adr/0003-dom-decorator-and-span-recycling.md`](docs/adr/0003-dom-decorator-and-span-recycling.md) — DOM Decorator and Span Recycling
* [`docs/adr/0004-multi-panel-workspace-and-flow-editor.md`](docs/adr/0004-multi-panel-workspace-and-flow-editor.md) — Multi-Panel Workspace and Flow Editor Topology

Deep architectural guides are located in [`docs/architecture/`](docs/architecture/):
* [`docs/architecture/overview.md`](docs/architecture/overview.md) — EditorV2 System Overview
* [`docs/architecture/core-concepts.md`](docs/architecture/core-concepts.md) — DocumentModel, Blocks, and Format Ranges
* [`docs/architecture/dom-synchronization.md`](docs/architecture/dom-synchronization.md) — DOM Reconciliation and Span Decorators
* [`docs/architecture/change-tracking.md`](docs/architecture/change-tracking.md) — Diff Computation and Version History

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.