# EditorV2 Architecture Documentation

This directory contains comprehensive documentation for the new EditorV2 architecture.

## Documentation Structure

- **Architecture Overview** - High-level design and component relationships
- **Core Components** - Detailed documentation of each component
- **Data Structures** - Interval trees, document model, etc.
- **Formatting Engine** - How text formatting is applied and managed
- **Line Registry** - Visual line management and rendering
- **Performance Optimizations** - Strategies for handling large documents
- **Migration Guide** - Moving from old editor to EditorV2

## Key Design Decisions

1. Single contentEditable approach for better browser compatibility
2. Virtual document model for consistent state management
3. Interval tree for efficient formatting operations
4. Separate visual line tracking for proper line numbering
5. Command pattern for all document modifications