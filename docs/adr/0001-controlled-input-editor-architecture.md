# ADR 0001: Controlled Input Editor Architecture (EditorV2)

* **Status**: Accepted & Implemented
* **Date**: 2026-09-02
* **Deciders**: Frontend & Editor Engineering Team

---

## Context & Problem Statement

Native browser `contentEditable` behavior is fundamentally non-deterministic across browser engines (WebKit, Blink, Gecko), producing divergent DOM trees, broken cursor positions, and inconsistent inline styling when processing rich text. Standard rich text wrappers that rely on browser `execCommand` or uncontrolled DOM mutations fail under collaborative editing, complex formatting hierarchies, and undo/redo stacks.

---

## Decision Drivers

1. **Cross-Browser Determinism**: Ensure character-level mutations and cursor placements produce identical states on all platforms.
2. **Atomic Edit Operations**: Route all insertions, deletions, and formatting operations through a single source-of-truth document model.
3. **High-Performance Rendering**: Isolate DOM updates to affected semantic blocks without re-rendering the full document.

---

## Decision Outcome

Implement a **Controlled Input Architecture** via `EditorV2`:

```
User Typing / Keyboard Event
             |
             v
+------------------------------------------+
| InputHandlerService (services/input.ts)  |
| - Intercepts 'beforeinput' & 'keydown'   |
| - Calls event.preventDefault()           |
| - Maps browser intent to atomic Op       |
+--------------------+---------------------+
                     |
                     v
+------------------------------------------+
| DocumentModel (models/document-model.ts) |
| - Updates centralized in-memory state    |
| - Computes minimal structural diff       |
+--------------------+---------------------+
                     |
                     v
+------------------------------------------+
| DOMDecoratorService (services/dom.ts)    |
| - Re-renders only modified blocks        |
| - Synchronizes selection / cursor range  |
+------------------------------------------+
```

### Positive Consequences
* Absolute control over input semantics, IME composition, and keyboard shortcuts.
* Zero dependence on fragile `execCommand` APIs.
* Foundational support for operational transformation and historical diff tracking.
