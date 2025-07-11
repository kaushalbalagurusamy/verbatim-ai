# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Stage 7 Complete**: EditorV2 Hardening Project
  - Fixed critical temporal dead zone (TDZ) issue in SingleContentEditableEditor
  - Resolved race conditions in ToolbarIntegrationService initialization
  - Fixed DOMDecoratorService initialization timing
  - Added comprehensive regression tests for TDZ and race conditions
  - Implemented feature flag system with `enableEditorV2Hardening`
  - Created Plugin API placeholder interface for future extensibility
  - Enhanced accessibility features with proper ARIA attributes on toolbar
  - Added support for environment variable overrides for feature flags

### Fixed
- **ReferenceError**: Fixed "Cannot access uninitialized variable" by reordering function definitions
- **Race Conditions**: Toolbar service now initializes properly with useLayoutEffect
- **Accessibility**: Added proper ARIA roles, labels, and states to editor toolbar buttons

### Changed
- Editor components now use feature flag to switch between legacy and V2 implementation
- Improved initialization sequence for editor services

### Technical Details
- Moved `offsetToDOM`, `domToOffset`, `getDocumentSelection`, `setDocumentSelection`, and `renderContent` functions before `useImperativeHandle` to avoid TDZ
- Used stable ref pattern (`renderRef`) to maintain function references
- Enhanced toolbar with `role="toolbar"`, `aria-pressed` states, and descriptive `aria-label` attributes

## Previous Stages Completed

### Stage 0-6 (Previously Completed)
- Project bootstrap with dedicated branch and CI
- Data-layer robustness with UTF-16 handling
- Visual-line engine with mirror-div measurements
- DOM ↔ Model synchronization
- UI controls refactor with toolbar integration
- Performance optimizations and accessibility improvements
- Comprehensive automated testing suite

For detailed information about Stages 0-6, see `docs/editorV2-progress-report.md`.