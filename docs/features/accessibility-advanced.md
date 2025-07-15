# Accessibility Advanced Guide

This guide covers advanced accessibility features, custom implementations, and troubleshooting for the Editor V2.

## Advanced Features

### Custom Keyboard Shortcuts

Define accessible custom shortcuts:

```typescript
const shortcuts = {
  'Ctrl+Alt+1': {
    handler: () => setHeading(1),
    description: 'Apply heading level 1'
  },
  'Ctrl+Alt+B': {
    handler: () => toggleBold(),
    description: 'Toggle bold formatting'
  }
};

// Register shortcuts with descriptions for screen readers
editor.registerShortcuts(shortcuts);
```

### Reduced Motion Support

Respect user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  
  .editor-content {
    scroll-behavior: auto !important;
  }
}
```

### Touch Accessibility

Support for touch-based assistive technology:

```typescript
// Minimum touch target configuration
const touchConfig = {
  minTouchTargetSize: 44, // pixels
  touchTargetSpacing: 8,  // pixels
  gestures: {
    swipeRight: 'nextWord',
    swipeLeft: 'previousWord',
    twoFingerTap: 'selectWord'
  }
};
```

### Multi-Language Support

Accessibility announcements in multiple languages:

```typescript
const i18nAnnouncements = {
  en: {
    bold: 'Bold applied',
    undo: 'Action undone'
  },
  es: {
    bold: 'Negrita aplicada',
    undo: 'Acción deshecha'
  },
  fr: {
    bold: 'Gras appliqué',
    undo: 'Action annulée'
  }
};

editor.setAnnouncementLanguage('es');
```

## Custom Accessibility Service

### Creating Custom Announcements

```typescript
class CustomAccessibilityService extends AccessibilityService {
  announceWordCount() {
    const count = this.document.getWordCount();
    this.announce(`Document contains ${count} words`, 'polite');
  }
  
  announceReadingTime() {
    const minutes = Math.ceil(this.document.getWordCount() / 200);
    this.announce(`Estimated reading time: ${minutes} minutes`, 'polite');
  }
}
```

### Voice Control Integration

Integrate with voice control systems:

```typescript
const voiceCommands = {
  'bold selection': () => editor.applyFormatting('bold'),
  'go to start': () => editor.setCursor(0),
  'select all': () => editor.selectAll(),
  'read selection': () => editor.readSelection()
};

// Register with browser speech API
const recognition = new webkitSpeechRecognition();
recognition.onresult = (event) => {
  const command = event.results[0][0].transcript;
  if (voiceCommands[command]) {
    voiceCommands[command]();
  }
};
```

## Troubleshooting

### Screen Reader Issues

#### Problem: Announcements Not Heard

```typescript
// Debug announcements
window.DEBUG_ACCESSIBILITY = true;

// This will log all announcements
editor.on('announce', (message, priority) => {
  console.log(`[${priority}] ${message}`);
});

// Check if service is initialized
console.log('Service active:', editor.accessibilityService.isActive());
```

#### Problem: Wrong Language Announced

```typescript
// Force specific language
editor.accessibilityService.setLanguage('en-US');

// Check current language
console.log(editor.accessibilityService.getLanguage());
```

### Focus Management Issues

#### Problem: Focus Lost After Operation

```typescript
// Save and restore focus
const saveFocus = () => {
  const activeElement = document.activeElement;
  return () => activeElement?.focus();
};

// Use in operations
const restoreFocus = saveFocus();
await performOperation();
restoreFocus();
```

#### Problem: Focus Trap

```typescript
// Detect and fix focus traps
const detectFocusTrap = () => {
  const focusableElements = editor.getFocusableElements();
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  
  // Ensure Tab cycles properly
  last.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      first.focus();
    }
  });
};
```

### High Contrast Mode Issues

#### Problem: Insufficient Contrast

```typescript
// Test contrast ratios programmatically
const getContrastRatio = (fg, bg) => {
  // Implementation of WCAG contrast algorithm
  return calculateContrast(fg, bg);
};

// Verify all text meets standards
const elements = editor.querySelectorAll('*');
elements.forEach(el => {
  const ratio = getContrastRatio(
    getComputedStyle(el).color,
    getComputedStyle(el).backgroundColor
  );
  
  if (ratio < 4.5) {
    console.warn('Low contrast:', el, ratio);
  }
});
```

## Testing Tools

### Automated Testing

```typescript
// Jest + Testing Library
test('announces text insertion', async () => {
  const { container } = render(<AccessibleEditor />);
  const editor = container.querySelector('[role="textbox"]');
  
  // Type text
  await userEvent.type(editor, 'Hello');
  
  // Check announcement
  expect(screen.getByRole('status')).toHaveTextContent(
    'Inserted Hello at position 0'
  );
});
```

### Manual Testing Scripts

```typescript
// Comprehensive accessibility test
const runAccessibilityAudit = async () => {
  const results = {
    aria: checkAriaAttributes(),
    contrast: checkColorContrast(),
    keyboard: checkKeyboardAccess(),
    screenReader: checkScreenReaderSupport()
  };
  
  console.table(results);
  return results;
};
```

## Performance Considerations

### Optimizing Announcements

```typescript
// Batch announcements for performance
class AnnouncementQueue {
  constructor(delay = 100) {
    this.queue = [];
    this.delay = delay;
  }
  
  add(message, priority = 'polite') {
    this.queue.push({ message, priority });
    this.scheduleFlush();
  }
  
  scheduleFlush = debounce(() => {
    const summary = this.summarize(this.queue);
    announce(summary, 'polite');
    this.queue = [];
  }, this.delay);
}
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Accessibility Developer Tools](https://www.deque.com/axe/)