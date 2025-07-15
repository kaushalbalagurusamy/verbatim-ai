# Accessibility Features

The Editor V2 is built with accessibility as a core principle, ensuring that all users can effectively create and edit content regardless of their abilities. This guide covers the comprehensive accessibility features and how to use them.

## Overview

The editor achieves WCAG AA compliance with a Lighthouse accessibility score of 95+. It includes full screen reader support, keyboard navigation, high contrast mode, and proper ARIA attributes throughout.

## Screen Reader Support

### Live Announcements

All editor actions are announced to screen readers:
- Text changes: "Inserted 'Hello' at position 5"
- Formatting: "Bold applied to selected text"
- Navigation: "Moved to toolbar" / "Returned to editor"
- Errors: "Unable to paste. Clipboard is empty"

### Compatible Screen Readers

Full support for major screen readers:
- **NVDA** (Windows) - Full support
- **JAWS** (Windows) - Full support  
- **VoiceOver** (macOS/iOS) - Full support
- **TalkBack** (Android) - Partial support

### ARIA Implementation

The editor uses semantic ARIA attributes:

```html
<!-- Editor -->
<div role="textbox"
     aria-multiline="true"
     aria-label="Document editor"
     aria-describedby="editor-instructions">

<!-- Toolbar -->
<div role="toolbar"
     aria-orientation="horizontal"
     aria-label="Formatting toolbar">
  <button aria-label="Bold"
          aria-pressed="false"
          aria-keyshortcuts="Ctrl+B">
```

## Keyboard Navigation

### Complete Keyboard Access

Every feature is accessible via keyboard:

| Action | Key | Description |
|--------|-----|-------------|
| Navigate to toolbar | Tab | Move focus from editor to toolbar |
| Return to editor | Escape | Return focus from toolbar to editor |
| Navigate toolbar | Arrow keys | Move between toolbar buttons |
| First/last button | Home/End | Jump to toolbar ends |
| Apply formatting | Enter/Space | Activate focused button |

### Focus Management

The editor implements intelligent focus management:
- Clear visual focus indicators (2px solid outline)
- Focus trap prevention
- Logical tab order
- Focus restoration after operations

### Skip Links

Quick navigation for keyboard users:

```html
<a href="#editor" class="skip-link">Skip to editor</a>
<a href="#toolbar" class="skip-link">Skip to toolbar</a>
```

## Visual Accessibility

### High Contrast Mode

Automatic detection and enhanced visibility:

```css
/* Regular Mode */
.bold { font-weight: 600; }
.highlight { background: yellow; }

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .bold { 
    font-weight: 900;
    text-decoration: underline;
  }
  .highlight {
    outline: 2px solid;
    background: #FFFF00;
  }
}
```

### Focus Indicators

Clear focus visibility for keyboard navigation:
- 2px solid #4fc3f7 outline
- 2px offset for clarity
- High contrast: 3px white outline
- Always visible on keyboard focus

### Color Contrast

All text meets WCAG AA standards:
- Normal text: 4.5:1 minimum ratio
- Large text: 3:1 minimum ratio
- UI elements: 3:1 minimum ratio

## Usage

### Basic Accessible Editor

```typescript
import { AccessibleEditor } from '@/editor-v2/components/AccessibleEditor';

function App() {
  return (
    <AccessibleEditor
      initialContent="Welcome!"
      onChange={(content) => console.log(content)}
      enableAccessibility={true}
    />
  );
}
```

### Configuration Options

```typescript
<AccessibleEditor
  // Accessibility options
  enableAccessibility={true}
  announceChanges={true}
  highContrastMode="auto" // 'auto' | 'on' | 'off'
  
  // Screen reader verbosity
  verbosity="verbose" // 'minimal' | 'normal' | 'verbose'
  
  // Custom announcements
  customAnnouncements={{
    bold: 'Text emphasized',
    highlight: 'Text marked'
  }}
/>
```

### Programmatic Announcements

Make custom announcements:

```typescript
const accessibilityService = editor.getAccessibilityService();

// Announce to screen readers
accessibilityService.announce('Document saved', 'polite');
accessibilityService.announce('Error: Invalid format', 'assertive');

// Update live regions
accessibilityService.updateStatus('Ready');
```

## Testing Accessibility

### Manual Testing Checklist

- [ ] Navigate entire UI with keyboard only
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Verify focus indicators are always visible
- [ ] Check high contrast mode appearance
- [ ] Test at 200% zoom level
- [ ] Verify all controls have labels

### Automated Testing

Run accessibility tests:

```bash
# Lighthouse CLI
lighthouse http://localhost:8080 --only-categories=accessibility

# axe-core tests
pnpm test accessibility
```

### Browser Tools

Use built-in accessibility tools:
1. Chrome DevTools → Lighthouse → Accessibility
2. Firefox → Accessibility Inspector
3. Safari → Develop → Accessibility Audit

## Best Practices

### Content Guidelines

1. **Descriptive Labels**: Use clear, descriptive button labels
2. **Consistent Navigation**: Keep UI patterns predictable
3. **Error Messages**: Provide clear, actionable error text
4. **Status Updates**: Announce important state changes

### Development Guidelines

```typescript
// Good: Descriptive announcement
announce('Bold formatting applied to 5 words');

// Bad: Vague announcement  
announce('Formatting changed');

// Good: Proper ARIA
<button aria-label="Apply bold formatting" aria-pressed={isBold}>

// Bad: Missing context
<button>B</button>
```

For advanced features and troubleshooting, see [Accessibility Advanced Guide](./accessibility-advanced.md).