import type { MinimapMode, EditorTheme } from "../types";
import { ThemeManager } from "./ThemeManager";

export interface ToolbarEvents {
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAs: () => void;
  onSplit: (orientation: "horizontal" | "vertical") => void;
  onClosePane: () => void;
  onThemeChange: (theme: EditorTheme) => void;
  onLanguageChange: (language: string) => void;
  onMinimapChange: (mode: MinimapMode) => void;
  onFormat: (action: "bold" | "italic" | "h1" | "bullet" | "code") => void;
  onPreview?: () => void;
}

export class Toolbar {
  private container: HTMLElement;
  private events: ToolbarEvents;
  private languageSelect: HTMLSelectElement;
  private themeSelect: HTMLSelectElement;
  private minimapSelect: HTMLSelectElement;
  private fileNameEl: HTMLElement;

  constructor(container: HTMLElement, events: ToolbarEvents, themeManager: ThemeManager) {
    this.container = container;
    this.events = events;
    container.classList.add("toolbar");
    container.innerHTML = this.render(themeManager);
    this.fileNameEl = container.querySelector("#file-name") as HTMLElement;
    this.languageSelect = container.querySelector("#language-select") as HTMLSelectElement;
    this.themeSelect = container.querySelector("#theme-select") as HTMLSelectElement;
    this.minimapSelect = container.querySelector("#minimap-select") as HTMLSelectElement;
    this.bindEvents();
  }

  private render(themeManager: ThemeManager): string {
    const languages = [
      "plaintext", "typescript", "javascript", "json", "markdown", "html", "css",
      "scss", "python", "ruby", "go", "rust", "java", "c", "cpp", "csharp",
      "php", "swift", "kotlin", "shell", "yaml", "xml", "sql",
    ];
    const themes = ThemeManager.getThemeListWithCustom();
return `
      <div class="toolbar-left">
        <span class="app-badge">✦</span>
        <span class="app-title">Aurora Editor</span>
        <button class="tool-btn" data-action="new" title="新建（Ctrl+N）">新建</button>
        <button class="tool-btn" data-action="open" title="打开（Ctrl+O）">打开</button>
        <button class="tool-btn" data-action="save" title="保存（Ctrl+S）">保存</button>
        <button class="tool-btn" data-action="saveas" title="另存为">另存为…</button>
        <span class="toolbar-divider"></span>
        <button class="tool-btn" data-action="split-h" title="水平拆分">⇌ 拆分</button>
        <button class="tool-btn" data-action="split-v" title="垂直拆分">⇋ 拆分</button>
        <button class="tool-btn" data-action="close" title="关闭窗格">× 关闭</button>
      </div>
      <div class="toolbar-center">
        <span id="file-name" class="file-name">未命名</span>
      </div>
      <div class="toolbar-right">
        <select id="language-select" class="tool-select" title="语言">
          ${languages.map((l) => `<option value="${l}">${l}</option>`).join("")}
        </select>
        <select id="theme-select" class="tool-select" title="主题">
          ${themes.map((t) => `<option value="${t}">${ThemeManager.getThemeLabel(t)}</option>`).join("")}
        </select>
        <select id="minimap-select" class="tool-select" title="小地图">
          <option value="monaco">Monaco 地图</option>
          <option value="3d">3D 地图</option>
          <option value="off">关闭</option>
        </select>
        <span class="toolbar-divider"></span>
        <div class="format-group">
          <button class="tool-btn" data-action="bold" title="加粗">B</button>
          <button class="tool-btn" data-action="italic" title="斜体">I</button>
          <button class="tool-btn" data-action="h1" title="标题">H</button>
          <button class="tool-btn" data-action="bullet" title="项目符号列表">•</button>
          <button class="tool-btn" data-action="code" title="代码块">&lt;/&gt;</button>
        </div>
        <span class="toolbar-divider"></span>
        <button class="tool-btn preview-btn" data-action="preview" title="切换实时预览">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          预览
        </button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action")!;
      switch (action) {
        case "new": this.events.onNewFile(); break;
        case "open": this.events.onOpenFile(); break;
        case "save": this.events.onSaveFile(); break;
        case "saveas": this.events.onSaveAs(); break;
        case "split-h": this.events.onSplit("horizontal"); break;
        case "split-v": this.events.onSplit("vertical"); break;
        case "close": this.events.onClosePane(); break;
        case "bold": this.events.onFormat("bold"); break;
        case "italic": this.events.onFormat("italic"); break;
        case "h1": this.events.onFormat("h1"); break;
        case "bullet": this.events.onFormat("bullet"); break;
        case "code": this.events.onFormat("code"); break;
        case "preview": this.events.onPreview?.(); break;
      }
    });

    this.themeSelect.addEventListener("change", () => {
      this.events.onThemeChange(this.themeSelect.value as EditorTheme);
    });
    this.languageSelect.addEventListener("change", () => {
      this.events.onLanguageChange(this.languageSelect.value);
    });
    this.minimapSelect.addEventListener("change", () => {
      this.events.onMinimapChange(this.minimapSelect.value as MinimapMode);
    });
  }

  setFileName(name: string): void {
    this.fileNameEl.textContent = name;
    this.fileNameEl.title = name;
  }

  setLanguage(language: string): void {
    if (this.languageSelect.value !== language) {
      this.languageSelect.value = language;
    }
  }

  setTheme(theme: EditorTheme): void {
    if (this.themeSelect.value !== theme) {
      this.themeSelect.value = theme;
    }
  }

  setMinimap(mode: MinimapMode): void {
    if (this.minimapSelect.value !== mode) {
      this.minimapSelect.value = mode;
    }
  }
}