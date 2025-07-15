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

## Performance Features

### Virtual Scrolling

For large documents, the editor automatically enables virtual scrolling:

- Only visible content is rendered
- Maintains 60+ FPS with 100KB+ documents
- Seamless scrolling experience
- Automatic line number alignment

### Optimized Rendering

The editor uses several optimizations:

- Incremental DOM updates
- RequestAnimationFrame throttling
- Render caching for unchanged blocks
- GPU acceleration for scrolling

## Configuration Options

### Editor Props

```typescript
interface EditorProps {
  // Content
  initialContent?: string;
  placeholder?: string;
  
  // Behavior
  readOnly?: boolean;
  autoFocus?: boolean;
  spellCheck?: boolean;
  
  // Appearance
  className?: string;
  style?: CSSProperties;
  minHeight?: number;
  maxHeight?: number;
  
  // Features
  enableVirtualScroll?: boolean;
  enableLineNumbers?: boolean;
  enableAccessibility?: boolean;
  
  // Callbacks
  onChange?: (content: string) => void;
  onSelectionChange?: (selection: Selection) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}
```

### Advanced Configuration

```typescript
<SingleContentEditableEditor
  // Performance
  virtualScrollThreshold={1000}  // Enable virtual scroll after 1000 lines
  renderBufferSize={10}  // Render 10 extra lines above/below viewport
  
  // Behavior
  tabSize={4}  // Tab key inserts 4 spaces
  wordWrap={true}  // Wrap long lines
  
  // Formatting
  defaultFormats={{  // Default formatting for new text
    bold: false,
    highlight: null,
    minimize: false
  }}
/>
```

## Best Practices

1. **Content Validation**: Always validate content before saving
2. **Error Handling**: Handle edge cases gracefully
3. **Performance**: Use virtual scrolling for large documents
4. **Accessibility**: Keep accessibility features enabled
5. **Testing**: Test with different browsers and input methods

## Troubleshooting

### Common Issues

1. **Cursor jumping**: Ensure selection is restored after render
2. **IME input issues**: Check composition event handling
3. **Performance lag**: Enable virtual scrolling
4. **Focus loss**: Verify focus management in parent components

### Debug Mode

Enable debug logging:

```typescript
// In browser console
window.EDITOR_DEBUG = true;

// Or in component
<SingleContentEditableEditor debug={true} />
```