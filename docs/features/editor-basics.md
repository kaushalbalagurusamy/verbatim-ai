# Editor Basics

The Editor V2 is a powerful, performance-optimized text editor built for the modern web. This guide covers the core editing features and how to use them effectively.

## Overview

The editor provides a controlled editing experience where all operations go through a centralized document model. This architecture enables advanced features like real-time formatting, undo/redo, virtual scrolling, and perfect content preservation.

## Core Features

### Text Editing

The editor supports all standard text editing operations:

- **Typing**: Regular character input with full Unicode support
- **Selection**: Click and drag or keyboard selection
- **Navigation**: Arrow keys, Home/End, Ctrl+Arrow for word jumping
- **Deletion**: Backspace, Delete, Ctrl+Backspace/Delete for words

### Formatting

Apply rich text formatting to your content:

- **Bold** (Ctrl/Cmd+B): Emphasize important text
- **Highlight** (Ctrl/Cmd+H): Mark text with colored backgrounds
- **Minimize** (Ctrl/Cmd+M): Reduce text prominence
- **Headings** (Ctrl/Cmd+1-6): Structure content with heading levels

### Document Structure

Organize content with proper document structure:

- **Paragraphs**: Automatically created with Enter key
- **Line Breaks**: Soft breaks within paragraphs (Shift+Enter)
- **Block Types**: Convert between paragraphs and headings

## Getting Started

### Basic Integration

```typescript
import { SingleContentEditableEditor } from '@/editor-v2/components/SingleContentEditableEditor';

function App() {
  const [content, setContent] = useState('');

  return (
    <SingleContentEditableEditor
      initialContent="Start typing..."
      onChange={(newContent) => setContent(newContent)}
      placeholder="Enter your text here..."
    />
  );
}
```

### With Toolbar

For a complete editing experience with formatting toolbar:

```typescript
import { EditorV2WithToolbar } from '@/editor-v2/integration/EditorV2WithToolbar';

function App() {
  return (
    <EditorV2WithToolbar
      initialContent="Welcome to the editor!"
      onChange={(content) => console.log('Content updated:', content)}
    />
  );
}
```

## Input Handling

### Controlled Input System

All input is intercepted and processed through the document model:

1. **Input Event**: User types or performs action
2. **Intercept**: `beforeinput` event is caught
3. **Process**: Map to document operation
4. **Update**: Apply change to document model
5. **Render**: Update the view

### Supported Input Types

The editor handles all standard input types:

| Input Type | Action | Example |
|------------|--------|---------|
| insertText | Insert characters | Typing "Hello" |
| deleteContentBackward | Delete backwards | Backspace key |
| deleteContentForward | Delete forwards | Delete key |
| insertParagraph | New paragraph | Enter key |
| insertLineBreak | Soft break | Shift+Enter |
| insertFromPaste | Paste content | Ctrl+V |
| deleteByCut | Cut selection | Ctrl+X |

### Composition Events (IME)

Full support for Input Method Editors (IME) for languages like Chinese, Japanese, and Korean:

```typescript
// Automatic handling of composition
// 1. compositionstart - Begin IME input
// 2. compositionupdate - Preview text
// 3. compositionend - Commit final text
```

## Selection Management

### Selection State

The editor maintains precise selection state:

```typescript
interface Selection {
  start: number;  // Start offset in document
  end: number;    // End offset in document
  isCollapsed: boolean;  // True if cursor (no selection)
  direction: 'forward' | 'backward' | 'none';
}
```

### Programmatic Selection

Control selection programmatically:

```typescript
const editor = editorRef.current;

// Set cursor position
editor.setSelection(10, 10);

// Select range
editor.setSelection(5, 15);

// Select all
editor.selectAll();

// Get current selection
const selection = editor.getSelection();
```

## Content Management

### Getting Content

Retrieve content in different formats:

```typescript
// Get plain text
const plainText = editor.getPlainText();

// Get with formatting
const richContent = editor.getContent();

// Get as HTML
const html = editor.getHTML();

// Get selection only
const selectedText = editor.getSelectedText();
```

### Setting Content

Update editor content programmatically:

```typescript
// Replace all content
editor.setContent('New content here');

// Insert at cursor
editor.insertText('Inserted text');

// Replace selection
editor.replaceSelection('Replacement text');

// Clear editor
editor.clear();
```

## Event Handling

### Available Events

Listen to editor events:

```typescript
<SingleContentEditableEditor
  onChange={(content) => console.log('Content changed')}
  onSelectionChange={(selection) => console.log('Selection:', selection)}
  onFocus={() => console.log('Editor focused')}
  onBlur={() => console.log('Editor blurred')}
  onKeyDown={(event) => console.log('Key pressed:', event.key)}
/>
```

### Custom Key Bindings

Add custom keyboard shortcuts:

```typescript
const handleKeyDown = (event) => {
  // Custom save shortcut
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    saveDocument();
  }
};

<SingleContentEditableEditor onKeyDown={handleKeyDown} />
```

For advanced configuration, performance features, and troubleshooting, see [Editor Advanced Guide](./editor-advanced.md).