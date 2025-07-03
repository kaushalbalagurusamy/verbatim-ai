/**
 * Tab Manager - Centralized management for all tab operations
 * Handles tab creation, activation, closing, and state management
 */

import { documentStore, DocumentContent } from './document-store';

export type ViewType = 'document' | 'research' | 'pen' | 'source' | 'recordings' | 'flow';

export interface Tab {
  id: string;
  title: string;
  type: ViewType;
  active: boolean;
  modified: boolean;
  filePath?: string;
  documentId?: string; // Links to document store
}

export interface TabManagerState {
  tabs: Tab[];
  activeTabId: string | null;
}

class TabManager {
  private tabs: Map<string, Tab> = new Map();
  private activeTabId: string | null = null;
  private subscribers: Set<(state: TabManagerState) => void> = new Set();
  private idCounter = 1;

  /**
   * Generate unique tab ID
   */
  private generateId(): string {
    return `tab-${this.idCounter++}`;
  }

  /**
   * Get all tabs as array
   */
  getAllTabs(): Tab[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Get tabs filtered by type
   */
  getTabsByType(type: ViewType): Tab[] {
    return this.getAllTabs().filter(tab => tab.type === type);
  }

  /**
   * Get active tab
   */
  getActiveTab(): Tab | null {
    return this.activeTabId ? this.tabs.get(this.activeTabId) || null : null;
  }

  /**
   * Open a new tab or activate existing one
   */
  openTab(options: {
    title: string;
    type: ViewType;
    filePath?: string;
    content?: any;
  }): string {
    // Check for existing tab with same file path
    if (options.filePath) {
      const existingTab = this.getAllTabs().find(tab => tab.filePath === options.filePath);
      if (existingTab) {
        this.activateTab(existingTab.id);
        return existingTab.id;
      }
    }

    // Create new tab
    const tabId = this.generateId();
    const documentId = `doc-${tabId}`;
    
    const newTab: Tab = {
      id: tabId,
      title: options.title,
      type: options.type,
      active: false,
      modified: false,
      filePath: options.filePath,
      documentId
    };

    // Create associated document
    const docContent: DocumentContent = {
      id: documentId,
      type: options.type === 'flow' ? 'flow' : 'document',
      title: options.title,
      content: options.content || this.getDefaultContent(options.type),
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        filePath: options.filePath
      }
    };
    
    documentStore.setDocument(docContent);
    this.tabs.set(tabId, newTab);
    this.activateTab(tabId);
    
    return tabId;
  }

  /**
   * Get default content for a tab type
   */
  private getDefaultContent(type: ViewType): any {
    switch (type) {
      case 'flow':
        return {
          columns: ['Column A', 'Column B', 'Column C'],
          rows: []
        };
      case 'document':
      default:
        return { text: '' };
    }
  }

  /**
   * Activate a tab
   */
  activateTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Deactivate all tabs
    this.tabs.forEach(t => t.active = false);
    
    // Activate selected tab
    tab.active = true;
    this.activeTabId = tabId;
    
    this.notifySubscribers();
  }

  /**
   * Close a tab
   */
  closeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Delete associated document
    if (tab.documentId) {
      documentStore.deleteDocument(tab.documentId);
    }

    // Remove tab
    this.tabs.delete(tabId);

    // If this was the active tab, activate another
    if (this.activeTabId === tabId) {
      const remainingTabs = this.getAllTabs();
      if (remainingTabs.length > 0) {
        // Find the closest tab to activate
        const tabArray = Array.from(this.tabs.values());
        const closedIndex = tabArray.findIndex(t => t.id === tabId);
        const newIndex = Math.min(closedIndex, remainingTabs.length - 1);
        this.activateTab(remainingTabs[newIndex].id);
      } else {
        this.activeTabId = null;
      }
    }

    this.notifySubscribers();
  }

  /**
   * Update tab title
   */
  updateTabTitle(tabId: string, title: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    tab.title = title;
    
    // Update associated document title
    if (tab.documentId) {
      documentStore.updateTitle(tab.documentId, title);
    }

    this.notifySubscribers();
  }

  /**
   * Mark tab as modified
   */
  setTabModified(tabId: string, modified: boolean): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    tab.modified = modified;
    this.notifySubscribers();
  }

  /**
   * Subscribe to tab changes
   */
  subscribe(callback: (state: TabManagerState) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    const state: TabManagerState = {
      tabs: this.getAllTabs(),
      activeTabId: this.activeTabId
    };
    
    this.subscribers.forEach(callback => callback(state));
  }

  /**
   * Clear all tabs (use with caution)
   */
  clear(): void {
    this.tabs.clear();
    this.activeTabId = null;
    documentStore.clear();
    this.notifySubscribers();
  }
}

// Export singleton instance
export const tabManager = new TabManager();

// React hook for using tab manager
import { useEffect, useState } from 'react';

export function useTabManager() {
  const [state, setState] = useState<TabManagerState>({
    tabs: tabManager.getAllTabs(),
    activeTabId: tabManager.getActiveTab()?.id || null
  });

  useEffect(() => {
    const unsubscribe = tabManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    tabs: state.tabs,
    activeTab: state.tabs.find(tab => tab.id === state.activeTabId) || null,
    openTab: tabManager.openTab.bind(tabManager),
    closeTab: tabManager.closeTab.bind(tabManager),
    activateTab: tabManager.activateTab.bind(tabManager),
    updateTabTitle: tabManager.updateTabTitle.bind(tabManager)
  };
}