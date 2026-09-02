# ADR 0004: Multi-Panel Workspace and Flow Editor Topology

* **Status**: Accepted & Implemented
* **Date**: 2026-09-02
* **Deciders**: Frontend & UI/UX Engineering Team

---

## Context & Problem Statement

Legal, policy, and academic drafting workflows require switching between raw text editing, visual argument mapping (flow graphing), source material verification, and context-aware AI synthesis. Forcing users into a single monolithic editor tab prevents spatial reference and simultaneous AI analysis.

---

## Decision Drivers

1. **Integrated Multi-Modal Workspace**: Provide a cohesive, VS Code-inspired three-panel layout (Sidebar Navigation, Central Canvas/Editor, Right AI Copilot).
2. **Specialized Views**: Support 4 distinct operational modes:
   * **Document View**: Deep structured text editing with EditorV2.
   * **Flow View**: Node-based argument and claim mapping.
   * **Source View**: Citation, cross-reference, and evidence management.
   * **Recordings View**: Audio dictation, note-taking, and transcript synchronization.
3. **Responsive Resizability**: Enable smooth client-side layout adjustments with `react-resizable-panels`.

---

## Decision Outcome

Structure the application around a modular panel layout orchestrated by `src/pages/Index.tsx`:

* **Left Panel**: `Sidebar.tsx` + `FileTree.tsx` for hierarchical document navigation and search.
* **Center Canvas**: Dynamically switches between `MainEditor.tsx` (EditorV2) and `FlowEditor.tsx` based on active view mode.
* **Right Panel**: `ChatPanel.tsx` providing real-time AI contextual analysis and text transformations.
* **Top Bar**: `TopBar.tsx` controlling workspace global actions, export pipelines, and view switching.

### Positive Consequences
* Clear separation of concerns between document navigation, editing, and AI streaming.
* Smooth multi-view transitions without state loss or editor unmounting.
