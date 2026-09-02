# ADR 0003: DOM Decorator and Span Recycling

* **Status**: Accepted & Implemented
* **Date**: 2026-09-02
* **Deciders**: Frontend & Performance Engineering Team

---

## Context & Problem Statement

Rendering formatted rich text (nested spans for font weight, color, background highlights, and search highlights) by naive innerHTML replacement triggers massive browser garbage collection and layout reflow cycles during rapid keystrokes, causing input lag on long documents.

---

## Decision Drivers

1. **60 FPS Typing Responsiveness**: Typing latency must remain $< 16\text{ms}$ even in large multi-page documents.
2. **DOM Element Recycling**: Reuse existing `<span>` nodes where possible to prevent memory thrashing.
3. **Selection Restoration**: Accurately restore DOM selection ranges across DOM node mutations.

---

## Decision Outcome

Implement `DOMDecoratorService` featuring:

1. **Span Pooling & Recycling**:
   * Pre-allocates and recycles styled `HTMLSpanElement` instances during formatting reconciliation.
2. **Interval Merging & Slicing**:
   * Computes disjoint text intervals from overlapping format ranges (e.g. bold range $[0, 10]$ and italic range $[5, 15] \to [0, 5], [5, 10], [10, 15]$) to create minimal flat DOM trees.
3. **Shadow DOM Fallback**:
   * Provides isolated shadow root rendering for specialized platforms (e.g. iOS WebKit plaintext compatibility mode).

### Positive Consequences
* Stable memory footprint during sustained high-speed typing sessions.
* Elimination of visual flickering and lost cursor focus during formatting toggles.
