# Unit Testing Guide

Unit tests validate individual components and functions in isolation, ensuring each piece works correctly before integration.

## Overview

Our unit testing strategy focuses on testing the smallest testable parts of the application independently. This includes individual functions, classes, and React components.

## Test Organization

```
src/
├── editor-v2/
│   ├── models/__tests__/          # Model unit tests
│   ├── services/__tests__/        # Service unit tests
│   ├── utils/__tests__/           # Utility function tests
│   └── components/__tests__/      # Component unit tests
├── components/__tests__/          # UI component tests
└── utils/__tests__/              # General utility tests
```

## Testing Frameworks

- **Jest/Vitest**: Primary testing framework
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing
- **MSW**: API mocking

## Key Test Areas

### Document Model Tests
```typescript
describe('DocumentModel', () => {
  test('should insert text at correct position', () => {
    const model = new DocumentModel();
    model.insertText(0, 'Hello');
    expect(model.getText()).toBe('Hello');
  });

  test('should handle UTF-16 correctly', () => {
    const model = new DocumentModel();
    model.insertText(0, '👨‍👩‍👧‍👦');
    expect(model.getLength()).toBe(11); // Correct UTF-16 length
  });
});
```

### Service Unit Tests
- Input handling
- Selection mapping
- Formatting engine
- Undo/redo operations
- Diff generation

### Component Tests
```typescript
describe('EditorToolbar', () => {
  test('should show active formats', () => {
    const { getByRole } = render(
      <EditorToolbar activeFormats={['bold']} />
    );
    
    const boldButton = getByRole('button', { name: 'Bold' });
    expect(boldButton).toHaveClass('active');
  });
});
```

## Writing Unit Tests

### Test Structure
```typescript
describe('ComponentName', () => {
  // Setup
  let instance;
  
  beforeEach(() => {
    instance = new Component();
  });
  
  afterEach(() => {
    instance.cleanup();
  });
  
  describe('methodName', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = instance.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
    
    test('should handle edge case', () => {
      // Test edge cases
    });
    
    test('should throw on invalid input', () => {
      // Test error handling
      expect(() => instance.method(null)).toThrow();
    });
  });
});
```

### Testing Best Practices

1. **Isolation**: Mock external dependencies
2. **Single Responsibility**: One assertion per test
3. **Descriptive Names**: Test names should describe behavior
4. **AAA Pattern**: Arrange, Act, Assert
5. **Edge Cases**: Test boundaries and error conditions

## Running Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test:unit --watch

# Run with coverage
pnpm test:unit --coverage

# Run specific test file
pnpm test:unit document-model.test.ts

# Debug tests
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Coverage Requirements

- Overall: >80%
- Critical paths: >90%
- New code: 100%

## Mock Strategies

### Service Mocks
```typescript
// Mock external service
jest.mock('../services/api', () => ({
  fetchDocument: jest.fn().mockResolvedValue({ 
    content: 'mocked' 
  })
}));
```

### Component Mocks
```typescript
// Mock child components
jest.mock('./ChildComponent', () => ({
  ChildComponent: () => <div>Mocked Child</div>
}));
```

## Common Patterns

### Testing Async Operations
```typescript
test('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Event Handlers
```typescript
test('should call handler on click', () => {
  const handleClick = jest.fn();
  const { getByRole } = render(
    <Button onClick={handleClick}>Click me</Button>
  );
  
  fireEvent.click(getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing Hooks
```typescript
test('should update state', () => {
  const { result } = renderHook(() => useCustomHook());
  
  act(() => {
    result.current.updateValue('new');
  });
  
  expect(result.current.value).toBe('new');
});
```

## Debugging Failed Tests

1. **Use focused tests**: `test.only()`
2. **Add console logs**: Temporary debugging
3. **Check test isolation**: Ensure no shared state
4. **Verify mocks**: Check mock implementations
5. **Use debugger**: `debugger` statements

## Maintenance

- Review and update tests with code changes
- Remove obsolete tests
- Refactor duplicate test code
- Keep tests fast and focused
- Document complex test scenarios