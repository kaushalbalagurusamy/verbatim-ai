/**
 * EditorPlugin API - Placeholder for future plugin system implementation
 * Defines the contract for extending editor functionality through plugins
 */

import type { DocumentModel } from '../models/document-model';
import type { TextFormatting } from '../data-structures/interval-tree';

/**
 * Plugin lifecycle events
 */
export interface PluginLifecycle {
  /**
   * Called when plugin is registered with the editor
   */
  onRegister?: () => void;
  
  /**
   * Called when plugin is activated
   */
  onActivate?: () => void;
  
  /**
   * Called when plugin is deactivated
   */
  onDeactivate?: () => void;
  
  /**
   * Called when plugin is unregistered
   */
  onUnregister?: () => void;
}

/**
 * Editor context provided to plugins
 */
export interface EditorContext {
  /**
   * Document model for text operations
   */
  document: DocumentModel;
  
  /**
   * Apply formatting to a range
   */
  applyFormatting: (formatting: TextFormatting) => void;
  
  /**
   * Remove formatting from a range
   */
  removeFormatting: (start: number, end: number, type?: TextFormatting['type']) => void;
  
  /**
   * Get current selection
   */
  getSelection: () => { start: number; end: number; isCollapsed: boolean } | null;
  
  /**
   * Set selection
   */
  setSelection: (start: number, end: number) => void;
  
  /**
   * Render content (force re-render)
   */
  renderContent: () => void;
  
  /**
   * Register a command
   */
  registerCommand: (command: PluginCommand) => void;
  
  /**
   * Register a toolbar action
   */
  registerToolbarAction: (action: PluginToolbarAction) => void;
}

/**
 * Plugin command definition
 */
export interface PluginCommand {
  /**
   * Unique command ID
   */
  id: string;
  
  /**
   * Display name
   */
  name: string;
  
  /**
   * Command description
   */
  description?: string;
  
  /**
   * Keyboard shortcut (e.g., 'Ctrl+Shift+P')
   */
  keybinding?: string;
  
  /**
   * Command execution handler
   */
  execute: (context: EditorContext) => void;
}

/**
 * Plugin toolbar action
 */
export interface PluginToolbarAction {
  /**
   * Unique action ID
   */
  id: string;
  
  /**
   * Toolbar button label
   */
  label: string;
  
  /**
   * Icon (can be a React component or icon name)
   */
  icon?: React.ComponentType | string;
  
  /**
   * Tooltip text
   */
  tooltip?: string;
  
  /**
   * Is action currently active
   */
  isActive?: (context: EditorContext) => boolean;
  
  /**
   * Action execution handler
   */
  execute: (context: EditorContext) => void;
}

/**
 * Main plugin interface
 */
export interface EditorPlugin extends PluginLifecycle {
  /**
   * Unique plugin ID
   */
  id: string;
  
  /**
   * Plugin display name
   */
  name: string;
  
  /**
   * Plugin version
   */
  version: string;
  
  /**
   * Plugin description
   */
  description?: string;
  
  /**
   * Plugin dependencies (other plugin IDs)
   */
  dependencies?: string[];
  
  /**
   * Initialize plugin with editor context
   */
  init(context: EditorContext): void;
  
  /**
   * Cleanup plugin resources
   */
  destroy?(): void;
}

/**
 * Plugin manager interface (TODO: Implement)
 */
export interface PluginManager {
  /**
   * Register a plugin
   */
  register(plugin: EditorPlugin): void;
  
  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void;
  
  /**
   * Get registered plugin
   */
  getPlugin(pluginId: string): EditorPlugin | undefined;
  
  /**
   * Get all registered plugins
   */
  getPlugins(): EditorPlugin[];
  
  /**
   * Enable a plugin
   */
  enable(pluginId: string): void;
  
  /**
   * Disable a plugin
   */
  disable(pluginId: string): void;
  
  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean;
}

// TODO: Implement PluginManager class
// TODO: Add plugin loading mechanism
// TODO: Add plugin configuration support
// TODO: Add plugin marketplace/registry support
// TODO: Add plugin sandboxing for security