import { Workspace } from "../fs/Workspace";
import { SearchResult, FileEntry } from "../types";

interface SearchPanelCallbacks {
  onOpenFile: (path: string, line: number) => void;
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "target", ".vscode", ".idea", "out", "coverage"]);
const SKIP_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "ico", "woff", "woff2", "ttf", "eot", "zip", "gz", "tar", "exe", "dll", "obj", "bin", "wasm", "map", "min.js", "min.css"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_RESULTS = 2000;

export class SearchPanel {
  private container: HTMLElement;
  private workspace: Workspace;
  private callbacks: SearchPanelCallbacks;
  private listElement: HTMLElement | null = null;
  private queryInput: HTMLInputElement | null = null;
  private regexBtn: HTMLButtonElement | null = null;
  private caseBtn: HTMLButtonElement | null = null;
  private searchBtn: HTMLButtonElement | null = null;
  private isSearching = false;
  private currentResults: Map<string, SearchResult[]> = new Map();

  constructor(container: HTMLElement, workspace: Workspace, callbacks: SearchPanelCallbacks) {
    this.container = container;
    this.workspace = workspace;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    const toolbar = document.createElement("div");
    toolbar.className = "panel-toolbar";
    toolbar.style.flexWrap = "wrap";
    toolbar.style.gap = "6px";

    this.queryInput = document.createElement("input");
    this.queryInput.className = "panel-input";
    this.queryInput.placeholder = "在文件中搜索...";
    this.queryInput.style.flex = "1";
    this.queryInput.style.minWidth = "150px";
    this.queryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.runSearchFromUI();
    });
    toolbar.appendChild(this.queryInput);

    this.regexBtn = document.createElement("button");
    this.regexBtn.className = "panel-toolbar-btn";
    this.regexBtn.textContent = ".*";
    this.regexBtn.title = "正则";
    this.regexBtn.addEventListener("click", () => this.toggleButton(this.regexBtn!));
    toolbar.appendChild(this.regexBtn);

    this.caseBtn = document.createElement("button");
    this.caseBtn.className = "panel-toolbar-btn";
    this.caseBtn.textContent = "Aa";
    this.caseBtn.title = "区分大小写";
    this.caseBtn.addEventListener("click", () => this.toggleButton(this.caseBtn!));
    toolbar.appendChild(this.caseBtn);

    this.searchBtn = document.createElement("button");
    this.searchBtn.className = "panel-toolbar-btn";
    this.searchBtn.textContent = "搜索";
    this.searchBtn.addEventListener("click", () => this.runSearchFromUI());
    toolbar.appendChild(this.searchBtn);

    this.container.appendChild(toolbar);

    this.listElement = document.createElement("div");
    this.listElement.className = "panel-list";
    this.container.appendChild(this.listElement);

    this.updateEmptyState();
  }

  private toggleButton(btn: HTMLButtonElement): void {
    btn.classList.toggle("active");
  }

  private getOptions(): { regex: boolean; caseSensitive: boolean } {
    return {
      regex: this.regexBtn?.classList.contains("active") ?? false,
      caseSensitive: this.caseBtn?.classList.contains("active") ?? false,
    };
  }

  private runSearchFromUI(): void {
    const query = this.queryInput?.value.trim() ?? "";
    if (!query) return;
    const opts = this.getOptions();
    this.runSearch(query, opts);
  }

  public async runSearch(query: string, opts: { regex: boolean; caseSensitive: boolean }): Promise<void> {
    if (this.isSearching || !this.workspace.root) return;
    this.isSearching = true;

    if (this.listElement) {
      this.listElement.innerHTML = "";
      const searching = document.createElement("div");
      searching.className = "panel-empty";
      searching.textContent = "正在搜索…";
      this.listElement.appendChild(searching);
    }

    this.currentResults.clear();
    let totalResults = 0;

    try {
      await this.searchWorkspace(this.workspace.root, query, opts, (results) => {
        totalResults += results.length;
        if (totalResults > MAX_RESULTS) return false;
        return true;
      });
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      this.isSearching = false;
      this.renderResults();
      if (this.listElement && this.listElement.children.length === 0) {
        this.updateEmptyState();
      }
    }
  }

  private async searchWorkspace(
    dirPath: string,
    query: string,
    opts: { regex: boolean; caseSensitive: boolean },
    onBatch: (results: SearchResult[]) => boolean
  ): Promise<void> {
    try {
      const entries = await this.workspace.listDir(dirPath);
      for (const entry of entries) {
        if (entry.isDir) {
          if (SKIP_DIRS.has(entry.name)) continue;
          await this.searchWorkspace(entry.path, query, opts, onBatch);
        } else {
          if (this.shouldSkipFile(entry.name)) continue;
          const results = await this.searchFile(entry.path, query, opts);
          if (results.length > 0) {
            this.currentResults.set(entry.path, results);
            if (!onBatch(results)) return;
          }
        }
      }
    } catch (error) {
      console.error("Failed to search directory:", dirPath, error);
    }
  }

  private shouldSkipFile(fileName: string): boolean {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (SKIP_EXTS.has(ext)) return true;
    if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css")) return true;
    return false;
  }

  private async searchFile(
    filePath: string,
    query: string,
    opts: { regex: boolean; caseSensitive: boolean }
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const stat = await this.getFileSize(filePath);
      if (stat > MAX_FILE_SIZE) return results;

      const content = await this.workspace.readFile(filePath);
      const lines = content.split(/\r?\n/);

      let regex: RegExp;
      if (opts.regex) {
        try {
          const flags = opts.caseSensitive ? "g" : "gi";
          regex = new RegExp(query, flags);
        } catch {
          return results;
        }
      } else {
        const searchStr = opts.caseSensitive ? query : query.toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          const line = opts.caseSensitive ? lines[i] : lines[i].toLowerCase();
          let index = line.indexOf(searchStr);
          while (index !== -1) {
            results.push({
              path: filePath,
              line: i + 1,
              column: index + 1,
              text: lines[i].trim(),
            });
            index = line.indexOf(searchStr, index + 1);
          }
        }
        return results;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        while ((match = regex.exec(line)) !== null) {
          results.push({
            path: filePath,
            line: i + 1,
            column: match.index + 1,
            text: line.trim(),
          });
          if (!regex.global) break;
        }
      }
    } catch (error) {
      // Skip unreadable files
    }

    return results;
  }

  private async getFileSize(path: string): Promise<number> {
    try {
      const entries = await this.workspace.listDir(path.substring(0, path.lastIndexOf("\\")));
      const entry = entries.find((e) => e.path === path);
      return entry?.size ?? 0;
    } catch {
      return 0;
    }
  }

  private renderResults(): void {
    if (!this.listElement) return;
    this.listElement.innerHTML = "";

    let totalCount = 0;
    for (const [filePath, results] of this.currentResults) {
      totalCount += results.length;

      const fileHeader = document.createElement("div");
      fileHeader.className = "panel-item";
      fileHeader.style.fontWeight = "600";
      fileHeader.style.background = "color-mix(in srgb, var(--accent) 8%, transparent)";

      const iconSpan = document.createElement("span");
      iconSpan.className = "panel-item-icon";
      iconSpan.textContent = "\u{1F4C4}";
      fileHeader.appendChild(iconSpan);

      const textSpan = document.createElement("span");
      textSpan.className = "panel-item-text";
      textSpan.textContent = filePath;
      fileHeader.appendChild(textSpan);

      const metaSpan = document.createElement("span");
      metaSpan.className = "panel-item-meta";
      metaSpan.textContent = `${results.length} 个匹配`;
      fileHeader.appendChild(metaSpan);

      this.listElement!.appendChild(fileHeader);

      for (const result of results) {
        const item = document.createElement("div");
        item.className = "panel-item";
        item.style.paddingLeft = "28px";
        item.title = filePath;

        const iconSpan2 = document.createElement("span");
        iconSpan2.className = "panel-item-icon";
        iconSpan2.textContent = "\u{2022}";
        iconSpan2.style.color = "var(--accent)";
        item.appendChild(iconSpan2);

        const textSpan2 = document.createElement("span");
        textSpan2.className = "panel-item-text";
        textSpan2.innerHTML = this.highlightMatch(result.text, this.queryInput?.value ?? "", this.getOptions());
        item.appendChild(textSpan2);

        const metaSpan2 = document.createElement("span");
        metaSpan2.className = "panel-item-meta";
        metaSpan2.textContent = `${result.line}:${result.column}`;
        item.appendChild(metaSpan2);

        item.addEventListener("click", () => {
          this.callbacks.onOpenFile(result.path, result.line);
        });

        this.listElement!.appendChild(item);
      }
    }
  }

  private highlightMatch(text: string, query: string, opts: { regex: boolean; caseSensitive: boolean }): string {
    if (!query) return this.escapeHtml(text);

    if (opts.regex) {
      try {
        const flags = opts.caseSensitive ? "g" : "gi";
        const regex = new RegExp(query, flags);
        return this.escapeHtml(text).replace(regex, (match) => `<mark class="search-mark">${this.escapeHtml(match)}</mark>`);
      } catch {
        return this.escapeHtml(text);
      }
    } else {
      const searchStr = opts.caseSensitive ? query : query.toLowerCase();
      const escapedText = this.escapeHtml(text);
      const lowerText = opts.caseSensitive ? text : text.toLowerCase();
      let result = "";
      let lastIndex = 0;
      let index = lowerText.indexOf(searchStr);
      while (index !== -1) {
        result += escapedText.slice(lastIndex, index);
        result += `<mark class="search-mark">${escapedText.slice(index, index + query.length)}</mark>`;
        lastIndex = index + query.length;
        index = lowerText.indexOf(searchStr, lastIndex);
      }
      result += escapedText.slice(lastIndex);
      return result;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;")
      .replace(/'/g, "&" + "#039;");
  }

  private updateEmptyState(): void {
    if (!this.listElement) return;
    if (this.listElement.children.length === 0) {
      const empty = document.createElement("div");
      empty.className = "panel-empty";
      empty.textContent = this.workspace.root ? "没有结果" : "打开工作区后可搜索";
      this.listElement.appendChild(empty);
    }
  }

  public clear(): void {
    this.currentResults.clear();
    if (this.queryInput) this.queryInput.value = "";
    if (this.regexBtn) this.regexBtn.classList.remove("active");
    if (this.caseBtn) this.caseBtn.classList.remove("active");
    if (this.listElement) {
      this.listElement.innerHTML = "";
      this.updateEmptyState();
    }
  }
}