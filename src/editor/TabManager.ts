import { DocumentStore } from "./DocumentStore";
import { EditorCore } from "./EditorCore";
import type { TabInfo } from "../types";
import { TabsBar } from "../ui/TabsBar";

export interface TabManagerCallbacks {
  onActiveTabChanged: (tab: TabInfo | null) => void;
  onTabDirtyChanged: (tab: TabInfo) => void;
}

export class TabManager {
  private store: DocumentStore;
  private editorCore: EditorCore;
  private tabsBar: TabsBar;
  private callbacks: TabManagerCallbacks;
  private paneIds: Set<number> = new Set();
  private activePaneId: number = 0;

  constructor(
    store: DocumentStore,
    editorCore: EditorCore,
    tabsBar: TabsBar,
    callbacks: TabManagerCallbacks
  ) {
    this.store = store;
    this.editorCore = editorCore;
    this.tabsBar = tabsBar;
    this.callbacks = callbacks;

    this.store.setOnTabChanged((tab: TabInfo) => {
      this.refreshTabsBar();
      this.callbacks.onTabDirtyChanged(tab);
    });
  }

  openPath(path: string, content: string): TabInfo {
    const tab = this.store.open(path, content);
    this.bindActiveToPanes();
    this.refreshTabsBar();
    return tab;
  }

  createUntitled(): TabInfo {
    const tab = this.store.createUntitled();
    this.bindActiveToPanes();
    this.refreshTabsBar();
    return tab;
  }

  switchTab(tabId: string): void {
    this.store.setActive(tabId);
    this.bindActiveToPanes();
    this.refreshTabsBar();
    const activeTab = this.store.getTab(tabId) ?? null;
    this.callbacks.onActiveTabChanged(activeTab);
  }

  closeTab(tabId: string): void {
    const tab = this.store.getTab(tabId);
    if (tab && tab.isDirty) {
      if (!confirm("Close without saving?")) {
        return;
      }
    }
    this.store.close(tabId);
    this.bindActiveToPanes();
    this.refreshTabsBar();
    const activeTab = this.getActiveTab();
    this.callbacks.onActiveTabChanged(activeTab);
  }

  markSaved(): void {
    const activeId = this.store.getActiveTabId();
    if (activeId) {
      this.store.markSaved(activeId);
      this.refreshTabsBar();
      const tab = this.store.getTab(activeId);
      if (tab) this.callbacks.onTabDirtyChanged(tab);
    }
  }

  setActivePane(paneId: number): void {
    this.activePaneId = paneId;
    this.bindActiveToPanes();
  }

  registerPane(paneId: number): void {
    this.paneIds.add(paneId);
  }

  unregisterPane(paneId: number): void {
    this.paneIds.delete(paneId);
  }

  private bindActiveToPanes(): void {
    const activeId = this.store.getActiveTabId();
    const model = activeId ? this.store.getModel(activeId) : undefined;

    for (const paneId of this.paneIds) {
      this.editorCore.setModel(paneId, model ?? null);
    }
  }

  private refreshTabsBar(): void {
    const tabs = this.store.getTabs().map((t) => ({
      id: t.id,
      name: t.name,
      isDirty: t.isDirty,
    }));
    this.tabsBar.setTabs(tabs);
    this.tabsBar.setActive(this.store.getActiveTabId() ?? "");
  }

  getActiveTab(): TabInfo | null {
    const activeId = this.store.getActiveTabId();
    return activeId ? this.store.getTab(activeId) ?? null : null;
  }

  getActivePaneId(): number {
    return this.activePaneId;
  }
}