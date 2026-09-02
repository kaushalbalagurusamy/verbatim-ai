# ADR 0002: UTF-16 Block-Level Document Model

* **Status**: Accepted & Implemented
* **Date**: 2026-09-02
* **Deciders**: Frontend & Editor Engineering Team

---

## Context & Problem Statement

Document models must balance character-level formatting granularity with computational efficiency when managing documents with thousands of paragraphs. Indexing offsets using variable-width UTF-8 bytes causes misalignment with JavaScript's native UTF-16 string indexing (`String.prototype.length`, `codePointAt`), leading to cursor drift around multi-byte characters and emoji sequences.

---

## Decision Drivers

1. **JS Runtime Alignment**: Maintain UTF-16 code unit offsets to match native JavaScript string operations and browser `Selection` / `Range` APIs without expensive character transcoding.
2. **Block-Level Partitioning**: Divide document structures into independent semantic blocks (paragraphs, headers, lists, code blocks) to bound diff computations.
3. **Format Range Map**: Represent inline styles (bold, italic, underline, highlight, links) as non-overlapping or layered coordinate ranges within each block.

---

## Decision Outcome

1. **Document Tree Structure**:
   * A document consists of an ordered sequence of `Block` objects, each containing:
     * `id`: Unique UUID.
     * `type`: Block descriptor (e.g. `'paragraph'`, `'heading-1'`, `'list-item'`).
     * `text`: Plain UTF-16 string content.
     * `formats`: Sorted array of `{ start: number, end: number, type: FormatType, attributes?: object }`.
2. **Offset Arithmetic**:
   * All range operations enforce $[0, \text{text.length}]$ bounds using native UTF-16 indices.
3. **Atomic Operations**:
   * Edits mutate the document via discrete operations: `InsertTextOp`, `DeleteTextOp`, `ApplyFormatOp`, `SplitBlockOp`, `MergeBlockOp`.

### Positive Consequences
* Zero cursor drift when editing text containing emojis or multi-byte unicode glyphs.
* Fast partial re-rendering: modifying a single character only invalidates its parent block.
