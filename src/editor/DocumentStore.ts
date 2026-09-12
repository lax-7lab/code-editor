import * as monaco from "monaco-editor";
import type { EditorPaneState, TabInfo } from "../types";
import { detectLanguage, detectLineEndings } from "../util";

let untitledCounter = 0;

export class DocumentStore {
  private tabs: Map<string, TabInfo> = new Map();
  private models: Map<string, monaco.editor.ITextModel> = new Map();
  private activeTabId: string | null = null;
  private onTabChangedCallback: (tab: TabInfo) => void;

  constructor(onTabChanged: (tab: TabInfo) => void) {
    this.onTabChangedCallback = onTabChanged;
  }

  setOnTabChanged(callback: (tab: TabInfo) => void): void {
    this.onTabChangedCallback = callback;
  }

  private notifyTabChanged(tab: TabInfo): void {
    this.onTabChangedCallback(tab);
  }

  open(path: string, content: string): TabInfo {
    const existingTab = this.tabs.get(path);
    if (existingTab) {
      this.setActive(path);
      return existingTab;
    }

    const language = detectLanguage(path);
    const model = monaco.editor.createModel(content, language, monaco.Uri.file(path));

    const tab: TabInfo = {
      id: path,
      path,
      name: path.split(/[\\/]/).pop() ?? path,
      language,
      encoding: "UTF-8",
      lineEndings: detectLineEndings(content),
      isDirty: false,
      savedContent: content,
    };

    model.onDidChangeContent(() => {
      const currentTab = this.tabs.get(path);
      if (currentTab) {
        currentTab.isDirty = model.getValue() !== currentTab.savedContent;
        this.notifyTabChanged(currentTab);
      }
    });

    this.tabs.set(path, tab);
    this.models.set(path, model);
    this.setActive(path);
    return tab;
  }

  createUntitled(): TabInfo {
    untitledCounter++;
    const id = `untitled-${untitledCounter}`;
    const model = monaco.editor.createModel("", "plaintext", monaco.Uri.file(`untitled-${untitledCounter}`));

    const tab: TabInfo = {
      id,
      path: null,
      name: "untitled",
      language: "plaintext",
      encoding: "UTF-8",
      lineEndings: "LF",
      isDirty: false,
      savedContent: "",
    };

    model.onDidChangeContent(() => {
      const currentTab = this.tabs.get(id);
      if (currentTab) {
        currentTab.isDirty = model.getValue() !== currentTab.savedContent;
        this.notifyTabChanged(currentTab);
      }
    });

    this.tabs.set(id, tab);
    this.models.set(id, model);
    this.setActive(id);
    return tab;
  }

  getTab(tabId: string): TabInfo | undefined {
    return this.tabs.get(tabId);
  }

  getTabs(): TabInfo[] {
    return Array.from(this.tabs.values());
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  setActive(tabId: string): void {
    if (this.tabs.has(tabId)) {
      this.activeTabId = tabId;
    }
  }

  getModel(tabId: string): monaco.editor.ITextModel | undefined {
    return this.models.get(tabId);
  }

  getState(tabId: string): EditorPaneState | undefined {
    const tab = this.tabs.get(tabId);
    const model = this.models.get(tabId);
    if (!tab || !model) return undefined;

    return {
      id: 0,
      path: tab.path,
      content: model.getValue(),
      language: tab.language,
      encoding: tab.encoding,
      lineEndings: tab.lineEndings,
      isDirty: tab.isDirty,
    };
  }

  markSaved(tabId: string): void {
    const tab = this.tabs.get(tabId);
    const model = this.models.get(tabId);
    if (tab && model) {
      tab.savedContent = model.getValue();
      tab.isDirty = false;
      this.notifyTabChanged(tab);
    }
  }

  close(tabId: string): void {
    const model = this.models.get(tabId);
    if (model) {
      model.dispose();
      this.models.delete(tabId);
    }
    this.tabs.delete(tabId);

    if (this.activeTabId === tabId) {
      const remaining = Array.from(this.tabs.keys());
      this.activeTabId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  setLanguage(tabId: string, language: string): void {
    const tab = this.tabs.get(tabId);
    const model = this.models.get(tabId);
    if (tab && model) {
      monaco.editor.setModelLanguage(model, language);
      tab.language = language;
      this.notifyTabChanged(tab);
    }
  }

  getContent(tabId: string): string {
    const model = this.models.get(tabId);
    return model?.getValue() ?? "";
  }
}