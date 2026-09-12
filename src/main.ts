import "./styles/main.css";
import { EditorCore } from "./editor/EditorCore";
import { SplitView } from "./editor/SplitView";
import { DocumentStore } from "./editor/DocumentStore";
import { TabManager } from "./editor/TabManager";
import { initWorkers } from "./editor/Workers";
import { OutlineScanner } from "./editor/OutlineScanner";
import { registerSnippets } from "./editor/Snippets";
import { Preview } from "./editor/Preview";
import { DiffView } from "./editor/DiffView";
import { createFsAdapter } from "./fs/FsAdapter";
import { Workspace } from "./fs/Workspace";
import { FileTree, OutlinePanel, TasksPanel, SearchPanel } from "./explorer";
import { Toolbar } from "./ui/Toolbar";
import { StatusBar } from "./ui/StatusBar";
import { ThemeManager } from "./ui/ThemeManager";
import { ActivityBar } from "./ui/ActivityBar";
import { TabsBar } from "./ui/TabsBar";
import { Sidebar } from "./ui/Sidebar";
import { Panels } from "./ui/Panels";
import { Minimap3D } from "./ui/Minimap";
import { ThemeEditor } from "./ui/ThemeEditor";
import { MacroRecorder } from "./macro/MacroRecorder";
import { HexViewer, isBinaryContent } from "./hex";
import { DbPanel } from "./db";
import { TerminalPanel } from "./terminal";
import type { CustomThemeColors } from "./ui/ThemeManager";
import { SettingsStore } from "./core/SettingsStore";
import { CommandRegistry } from "./core/CommandRegistry";
import { CommandPalette } from "./core/CommandPalette";
import type {
  ActivityId,
  EditorTheme,
  MinimapMode,
  TabInfo,
  EditorPaneState,
  Settings,
} from "./types";

initWorkers();
OutlineScanner.registerMonacoProviders();
registerSnippets();

const WELCOME = `# Aurora Editor

一款基于 Tauri、Monaco 和 Three.js 构建的现代桌面代码编辑器。

## 快速开始

- **Ctrl+N** — 新建文件
- **Ctrl+O** — 打开文件
- **Ctrl+S** — 保存
- **Ctrl+Shift+P** — 命令面板
- **Ctrl+W** — 关闭标签页

## 功能特性

- **资源管理器** — 浏览并打开工作区文件夹中的文件
- **大纲** — 跳转到当前文件中的符号
- **搜索** — 在整个工作区中查找文本
- **任务** — 扫描 TODO / FIXME / HACK 标记
- **实时预览** — 并排渲染 Markdown 和 HTML
- **差异视图** — 对比已保存版本与当前编辑
- **拆分编辑器** — 同时处理多个窗格
- **3D 小地图** — 基于 Three.js 的代码小地图

从工具栏打开一个文件夹，开始编辑吧。
`;

class App {
  private themeManager = new ThemeManager();
  private settings = new SettingsStore();
  private editorCore!: EditorCore;
  private splitView!: SplitView;
  private documentStore!: DocumentStore;
  private tabManager!: TabManager;
  private tabsBar!: TabsBar;
  private toolbar!: Toolbar;
  private statusbar!: StatusBar;
  private activityBar!: ActivityBar;
  private sidebar!: Sidebar;
  private panels!: Panels;
  private fileTree!: FileTree;
  private outlinePanel!: OutlinePanel;
  private tasksPanel!: TasksPanel;
  private searchPanel!: SearchPanel;
  private preview!: Preview;
  private diffView!: DiffView;
  private commandRegistry = new CommandRegistry();
  private commandPalette!: CommandPalette;
  private workspace!: Workspace;
  private minimap3d: Map<number, Minimap3D> = new Map();
  private minimapMode: MinimapMode = "monaco";
  private activePaneId = 0;
  private activeActivity: ActivityId | null = "explorer";
  private macroRecorder!: MacroRecorder;
  private hexViewer!: HexViewer;
  private dbPanel!: DbPanel;
  private themeEditor!: ThemeEditor;
  private hexVisible = false;
  private currentHexPath: string | null = null;
  private terminalPanel!: TerminalPanel;
  private activePanel: string = "tasks";

  async start(): Promise<void> {
    await this.settings.load();
    this.initUI();
    this.initExplorer();
    this.initPreviewDiff();
    this.initEditor();
    this.initCommands();
    this.initKeyboard();
    this.applySettings();
    this.themeManager.onChange((theme) => this.onThemeChanged(theme));
    this.initWorkspaceListeners();
    await this.restoreWorkspace();
  }

  // ---------------------------------------------------------------- UI shell

  private initUI(): void {
    const toolbarEl = document.getElementById("toolbar") as HTMLElement;
    const statusEl = document.getElementById("statusbar") as HTMLElement;
    this.statusbar = new StatusBar(statusEl);
    this.toolbar = new Toolbar(
      toolbarEl,
      {
        onNewFile: () => this.newFile(),
        onOpenFile: () => void this.openFileDialog(),
        onSaveFile: () => void this.saveActiveFile(),
        onSaveAs: () => void this.saveActiveFileAs(),
        onSplit: (o) => this.split(o),
        onClosePane: () => this.closePane(),
        onThemeChange: (t) => void this.setTheme(t),
        onLanguageChange: (l) => this.setLanguage(l),
        onMinimapChange: (m) => void this.setMinimapMode(m),
        onFormat: (a) => this.format(a),
        onPreview: () => this.togglePreview(),
      },
      this.themeManager
    );

    const activityEl = document.getElementById("activity-bar") as HTMLElement;
    this.activityBar = new ActivityBar(
      activityEl,
      (a) => this.onActivitySelected(a),
      () => this.onActivityDeselected()
    );

    const sidebarEl = document.getElementById("sidebar") as HTMLElement;
    this.sidebar = new Sidebar(sidebarEl, (w) => void this.settings.set("sidebarWidth", w));

    const panelEl = document.getElementById("bottom-panel") as HTMLElement;
    this.panels = new Panels(
      panelEl,
      { onSelect: (p) => this.onPanelSelected(p) },
      (h) => void this.settings.set("bottomPanelHeight", h)
    );

    this.statusbar.updateCursor(1, 1);
  }

  // ---------------------------------------------------------------- Editor core

  private initEditor(): void {
    this.editorCore = new EditorCore(
      {
        onCursorPosition: (line, col) => this.statusbar.updateCursor(line, col),
        onLanguageChange: (lang) => this.toolbar.setLanguage(lang),
        onContentChange: (state) => this.onContentChange(state),
        onPaneFocus: (paneId) => this.onPaneFocus(paneId),
      },
      this.themeManager
    );

    const panesEl = document.getElementById("editor-panes") as HTMLDivElement;
    this.splitView = new SplitView(panesEl, this.editorCore, {
      onPaneAdded: (id) => this.tabManager.registerPane(id),
      onPaneRemoved: (id) => this.tabManager.unregisterPane(id),
    });

    this.documentStore = new DocumentStore(() => {});
    const tabsEl = document.getElementById("tabs-bar") as HTMLElement;
    this.tabsBar = new TabsBar(tabsEl, {
      onSelect: (id) => this.tabManager.switchTab(id),
      onClose: (id) => this.tabManager.closeTab(id),
    });
    this.tabManager = new TabManager(this.documentStore, this.editorCore, this.tabsBar, {
      onActiveTabChanged: (tab) => this.onActiveTabChanged(tab),
      onTabDirtyChanged: (tab) => this.onTabDirtyChanged(tab),
    });

    this.activePaneId = this.splitView.addPane();
    this.tabManager.setActivePane(this.activePaneId);

    const tab = this.tabManager.createUntitled();
    const model = this.documentStore.getModel(tab.id);
    if (model) {
      model.setValue(WELCOME);
      this.documentStore.markSaved(tab.id);
    }
    this.onActiveTabChanged(tab);
  }

  // ---------------------------------------------------------------- Explorer / panels

  private initExplorer(): void {
    this.workspace = new Workspace(createFsAdapter());
    const sidebarHost = document.getElementById("sidebar-host") as HTMLElement;

    const treeView = document.createElement("div");
    treeView.className = "sidebar-view";
    treeView.dataset.view = "explorer";
    treeView.style.height = "100%";
    sidebarHost.appendChild(treeView);
    this.fileTree = new FileTree(treeView, this.workspace, {
      onOpenFile: (path) => void this.openWorkspaceFile(path),
    });

    const outlineView = document.createElement("div");
    outlineView.className = "sidebar-view";
    outlineView.dataset.view = "outline";
    outlineView.style.height = "100%";
    outlineView.style.display = "none";
    sidebarHost.appendChild(outlineView);
    this.outlinePanel = new OutlinePanel(outlineView, {
      onJump: (line, col) => this.jumpTo(line, col),
    });

    const settingsView = document.createElement("div");
    settingsView.className = "sidebar-view";
    settingsView.dataset.view = "settings";
    settingsView.style.height = "100%";
    settingsView.style.display = "none";
    sidebarHost.appendChild(settingsView);
    this.buildSettingsView(settingsView);

    const panelHost = document.getElementById("panel-host") as HTMLElement;

    const tasksView = document.createElement("div");
    tasksView.className = "panel-view";
    tasksView.dataset.view = "tasks";
    tasksView.style.height = "100%";
    panelHost.appendChild(tasksView);
    this.tasksPanel = new TasksPanel(tasksView, this.workspace, {
      onOpenFile: (path, line) => void this.openWorkspaceFileAtLine(path, line),
    });

    const searchView = document.createElement("div");
    searchView.className = "panel-view";
    searchView.dataset.view = "search";
    searchView.style.height = "100%";
    searchView.style.display = "none";
    panelHost.appendChild(searchView);
    this.searchPanel = new SearchPanel(searchView, this.workspace, {
      onOpenFile: (path, line) => void this.openWorkspaceFileAtLine(path, line),
    });

    const outputView = document.createElement("div");
    outputView.className = "panel-view";
    outputView.dataset.view = "output";
    outputView.style.height = "100%";
    outputView.style.display = "none";
    const outputEmpty = document.createElement("div");
    outputEmpty.className = "panel-empty";
    outputEmpty.textContent = "输出面板（即将推出）";
    outputView.appendChild(outputEmpty);
    panelHost.appendChild(outputView);

    const dbView = document.createElement("div");
    dbView.className = "panel-view";
    dbView.dataset.view = "db";
    dbView.style.height = "100%";
    dbView.style.display = "none";
    panelHost.appendChild(dbView);
    this.dbPanel = new DbPanel(dbView);
    this.panels.addTab("db", "数据库");

    const terminalView = document.createElement("div");
    terminalView.className = "panel-view";
    terminalView.dataset.view = "terminal";
    terminalView.style.height = "100%";
    terminalView.style.display = "none";
    panelHost.appendChild(terminalView);
    this.terminalPanel = new TerminalPanel(terminalView);
    this.panels.addTab("terminal", "终端");
  }

  private buildSettingsView(container: HTMLElement): void {
    const s = this.settings.get();
    const group = (title: string, body: HTMLElement): HTMLElement => {
      const g = document.createElement("div");
      g.className = "settings-group";
      const h = document.createElement("h3");
      h.className = "settings-group-title";
      h.textContent = title;
      g.appendChild(h);
      g.appendChild(body);
      return g;
    };
    const row = (label: string, control: HTMLElement): HTMLElement => {
      const r = document.createElement("div");
      r.className = "settings-row";
      const l = document.createElement("label");
      l.className = "settings-label";
      l.textContent = label;
      r.appendChild(l);
      r.appendChild(control);
      return r;
    };

    const themeSel = document.createElement("select");
    themeSel.className = "settings-select";
    for (const t of ThemeManager.getThemeListWithCustom()) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = ThemeManager.getThemeLabel(t);
      themeSel.appendChild(opt);
    }
    themeSel.value = s.theme;
    themeSel.addEventListener("change", () => void this.setTheme(themeSel.value as EditorTheme | "custom"));

    const fontSize = document.createElement("input");
    fontSize.type = "number";
    fontSize.min = "10";
    fontSize.max = "32";
    fontSize.value = String(s.fontSize);
    fontSize.addEventListener("change", () => {
      const v = Math.max(10, Math.min(32, Number(fontSize.value) || 14));
      fontSize.value = String(v);
      void this.settings.set("fontSize", v);
      this.applyEditorOptions();
    });

    const tabSize = document.createElement("input");
    tabSize.type = "number";
    tabSize.min = "2";
    tabSize.max = "8";
    tabSize.value = String(s.tabSize);
    tabSize.addEventListener("change", () => {
      const v = Math.max(2, Math.min(8, Number(tabSize.value) || 4));
      tabSize.value = String(v);
      void this.settings.set("tabSize", v);
      this.statusbar.setSpaces(v);
      this.applyEditorOptions();
    });

    const wordWrap = document.createElement("select");
    wordWrap.className = "settings-select";
    const WRAP_LABELS: Record<string, string> = { off: "关闭", on: "开启", wordWrapColumn: "指定列宽", bounded: "视口受限" };
    for (const w of ["off", "on", "wordWrapColumn", "bounded"] as const) {
      const opt = document.createElement("option");
      opt.value = w;
      opt.textContent = WRAP_LABELS[w];
      wordWrap.appendChild(opt);
    }
    wordWrap.value = s.wordWrap;
    wordWrap.addEventListener("change", () => {
      void this.settings.set("wordWrap", wordWrap.value as Settings["wordWrap"]);
      this.applyEditorOptions();
    });

    const ligatures = document.createElement("input");
    ligatures.type = "checkbox";
    ligatures.checked = s.fontLigatures;
    ligatures.addEventListener("change", () => {
      void this.settings.set("fontLigatures", ligatures.checked);
      this.applyEditorOptions();
    });

    const livePreview = document.createElement("input");
    livePreview.type = "checkbox";
    livePreview.checked = s.livePreview;
    livePreview.addEventListener("change", () => {
      void this.settings.set("livePreview", livePreview.checked);
      const state = this.getActiveState();
      if (state) this.updatePreview(state);
    });

    const themeEditorHost = document.createElement("div");
    themeEditorHost.className = "settings-theme-editor";
    this.themeEditor = new ThemeEditor(themeEditorHost, this.themeManager, (colors) => {
      this.themeManager.applyCustomTheme(colors);
      void this.settings.set("customTheme", colors as unknown as Record<string, string>);
      void this.settings.set("theme", "custom");
      themeSel.value = "custom";
    });
    const customThemeGroup = group("自定义主题", themeEditorHost);
    container.appendChild(customThemeGroup);

    const reset = document.createElement("button");
    reset.className = "settings-reset";
    reset.textContent = "重置设置";
    reset.addEventListener("click", () => {
      void this.settings.reset();
      this.applySettings();
    });

    const editorGroup = group("编辑器", document.createElement("div"));
    editorGroup.appendChild(row("主题", themeSel));
    editorGroup.appendChild(row("字号", fontSize));
    editorGroup.appendChild(row("制表符宽度", tabSize));
    editorGroup.appendChild(row("自动换行", wordWrap));
    editorGroup.appendChild(row("字体连字", ligatures));

    const previewGroup = group("预览", document.createElement("div"));
    previewGroup.appendChild(row("实时预览", livePreview));

    container.appendChild(editorGroup);
    container.appendChild(previewGroup);
    container.appendChild(reset);
  }

  // ---------------------------------------------------------------- Preview / Diff

  private initPreviewDiff(): void {
    const panesEl = document.getElementById("editor-panes") as HTMLDivElement;
    panesEl.style.position = "relative";

    const previewHost = document.createElement("div");
    previewHost.id = "preview-host";
    panesEl.appendChild(previewHost);
    this.preview = new Preview(previewHost, {
      onError: (msg) => console.warn("[Preview]", msg),
    });
    previewHost.style.position = "absolute";
    previewHost.style.zIndex = "5";

    const diffHost = document.createElement("div");
    diffHost.id = "diff-host";
    panesEl.appendChild(diffHost);
    this.diffView = new DiffView(diffHost);
    diffHost.style.position = "absolute";
    diffHost.style.zIndex = "5";

    const hexHost = document.createElement("div");
    hexHost.id = "hex-host";
    panesEl.appendChild(hexHost);
    this.hexViewer = new HexViewer(hexHost, {
      onSave: async (data) => {
        if (this.currentHexPath) {
          try {
            await this.workspace.writeBinary(this.currentHexPath, data);
          } catch (err) {
            console.error("Hex save failed:", err);
          }
        }
      },
    });
    hexHost.style.position = "absolute";
    hexHost.style.zIndex = "5";
    hexHost.style.display = "none";
  }

  // ---------------------------------------------------------------- Commands / keyboard

  private initCommands(): void {
    const reg = this.commandRegistry;
    reg.register({ id: "file.new", title: "新建文件", category: "文件", keys: "Ctrl+N", run: () => this.newFile() });
    reg.register({ id: "file.open", title: "打开文件…", category: "文件", keys: "Ctrl+O", run: () => void this.openFileDialog() });
    reg.register({ id: "file.openFolder", title: "打开文件夹…", category: "文件", run: () => void this.openFolder() });
    reg.register({ id: "file.save", title: "保存", category: "文件", keys: "Ctrl+S", run: () => void this.saveActiveFile() });
    reg.register({ id: "file.saveAs", title: "另存为…", category: "文件", run: () => void this.saveActiveFileAs() });
    reg.register({ id: "view.preview", title: "切换实时预览", category: "视图", run: () => this.togglePreview() });
    reg.register({ id: "view.diff", title: "切换差异视图", category: "视图", run: () => this.toggleDiff() });
    reg.register({ id: "view.splitH", title: "水平拆分编辑器", category: "视图", run: () => this.split("horizontal") });
    reg.register({ id: "view.splitV", title: "垂直拆分编辑器", category: "视图", run: () => this.split("vertical") });
    reg.register({ id: "view.closePane", title: "关闭窗格", category: "视图", run: () => this.closePane() });
    reg.register({ id: "view.explorer", title: "显示资源管理器", category: "视图", run: () => this.onActivitySelected("explorer") });
    reg.register({ id: "view.outline", title: "显示大纲", category: "视图", run: () => this.onActivitySelected("outline") });
    reg.register({ id: "view.tasks", title: "显示任务", category: "视图", run: () => this.onActivitySelected("tasks") });
    reg.register({ id: "view.search", title: "显示搜索", category: "视图", run: () => this.onActivitySelected("search") });
    reg.register({ id: "view.settings", title: "显示设置", category: "视图", run: () => this.onActivitySelected("settings") });
    reg.register({ id: "tasks.scan", title: "扫描工作区任务", category: "任务", run: () => void this.tasksPanel.runScan() });
    reg.register({ id: "format.document", title: "格式化文档", category: "格式化", run: () => void this.editorCore.formatDocument(this.activePaneId) });
    for (const t of ThemeManager.getThemeListWithCustom()) {
      reg.register({ id: `theme.${t}`, title: `主题: ${t}`, category: "主题", run: () => void this.setTheme(t) });
    }

    // Editor enhancements
    reg.register({ id: "editor.addCursorAbove", title: "在上方添加光标", category: "编辑器", run: () => this.editorCore.addCursorAbove(this.activePaneId) });
    reg.register({ id: "editor.addCursorBelow", title: "在下方添加光标", category: "编辑器", run: () => this.editorCore.addCursorBelow(this.activePaneId) });
    reg.register({ id: "editor.selectAllOccurrences", title: "选中所有匹配项", category: "编辑器", run: () => this.editorCore.selectAllOccurrences(this.activePaneId) });
    reg.register({ id: "editor.addSelectionToNextFindMatch", title: "将选中项加入下一个匹配", category: "编辑器", run: () => this.editorCore.addSelectionToNextFindMatch(this.activePaneId) });
    reg.register({ id: "editor.foldAll", title: "全部折叠", category: "编辑器", run: () => this.editorCore.foldAll(this.activePaneId) });
    reg.register({ id: "editor.unfoldAll", title: "全部展开", category: "编辑器", run: () => this.editorCore.unfoldAll(this.activePaneId) });
    reg.register({ id: "editor.toggleFold", title: "切换折叠", category: "编辑器", run: () => this.editorCore.toggleFold(this.activePaneId) });
    reg.register({ id: "editor.toggleWordWrap", title: "切换自动换行", category: "编辑器", run: () => this.editorCore.toggleWordWrap() });
    reg.register({ id: "editor.toggleMinimap", title: "切换小地图", category: "编辑器", run: () => this.editorCore.toggleMinimap() });

    // Macros
    this.macroRecorder = new MacroRecorder(this.editorCore, () => this.activePaneId);
    reg.register({ id: "macro.record", title: "录制宏", category: "宏", keys: "Ctrl+Shift+R", run: () => this.toggleMacroRecording() });
    reg.register({ id: "macro.stop", title: "停止录制", category: "宏", run: () => this.macroRecorder.stopRecording() });
    reg.register({ id: "macro.playLast", title: "播放上次宏", category: "宏", run: () => { const m = this.macroRecorder.getLast(); if (m) void this.macroRecorder.play(m); } });
    reg.register({ id: "macro.manage", title: "管理宏…", category: "宏", run: () => this.showMacroManager() });

    // Hex / DB views
    reg.register({ id: "view.hex", title: "切换十六进制查看器", category: "视图", run: () => void this.toggleHexView() });
    reg.register({ id: "view.db", title: "显示数据库面板", category: "视图", run: () => { this.panels.open("db"); this.onPanelSelected("db"); } });
    reg.register({ id: "view.terminal", title: "切换终端", category: "视图", keys: "Ctrl+`", run: () => this.toggleTerminal() });

    this.commandPalette = new CommandPalette(reg);
  }

  private initKeyboard(): void {
    window.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "p" && e.shiftKey) {
        e.preventDefault();
        this.commandPalette.toggle();
      } else if (key === "s") {
        e.preventDefault();
        void this.saveActiveFile();
      } else if (key === "o") {
        e.preventDefault();
        void this.openFileDialog();
      } else if (key === "n") {
        e.preventDefault();
        this.newFile();
      } else if (key === "r" && e.shiftKey) {
        e.preventDefault();
        this.toggleMacroRecording();
      } else if (key === "`") {
        e.preventDefault();
        this.toggleTerminal();
      } else if (key === "w") {
        e.preventDefault();
        const tab = this.tabManager.getActiveTab();
        if (tab) this.tabManager.closeTab(tab.id);
      }
    });
  }

  // ---------------------------------------------------------------- Settings

  private applySettings(): void {
    const s = this.settings.get();
    if (s.theme === "custom" && s.customTheme) {
      this.themeManager.applyCustomTheme(s.customTheme as unknown as CustomThemeColors);
      this.themeEditor?.setColors(s.customTheme as unknown as CustomThemeColors);
    } else {
      this.themeManager.applyTheme(s.theme as EditorTheme);
    }
    this.toolbar.setTheme(s.theme as EditorTheme);
    this.toolbar.setMinimap(s.minimap);
    this.minimapMode = s.minimap;
    this.editorCore.setMinimapMode(s.minimap);
    this.sidebar.setWidth(s.sidebarWidth);
    this.statusbar.setSpaces(s.tabSize);
    this.applyEditorOptions();
    if (s.bottomPanelOpen) {
      this.panels.open("tasks");
      this.onPanelSelected("tasks");
    }
  }

  private applyEditorOptions(): void {
    const s = this.settings.get();
    for (const id of this.splitView.getPaneIds()) {
      this.editorCore.getEditor(id)?.updateOptions({
        fontSize: s.fontSize,
        fontLigatures: s.fontLigatures,
        wordWrap: s.wordWrap,
        tabSize: s.tabSize,
      });
    }
  }

  private async restoreWorkspace(): Promise<void> {
    const s = this.settings.get();
    if (!s.lastWorkspace || !this.workspace.isNative()) return;
    try {
      const exists = await this.workspace.adapter.exists(s.lastWorkspace);
      if (exists) {
        this.workspace.root = s.lastWorkspace;
        await this.workspace.refresh();
      }
    } catch (err) {
      console.warn("Restore workspace failed:", err);
    }
  }

  private initWorkspaceListeners(): void {
    this.workspace.on("workspace-opened", () => {
      void this.settings.set("lastWorkspace", this.workspace.root);
    });
    this.workspace.on("workspace-closed", () => {
      void this.settings.set("lastWorkspace", null);
    });
  }

  // ---------------------------------------------------------------- Activity / panel routing

  private onActivitySelected(activity: ActivityId): void {
    switch (activity) {
      case "explorer":
        this.sidebar.show();
        this.showSidebarView("explorer");
        break;
      case "outline":
        this.sidebar.show();
        this.showSidebarView("outline");
        break;
      case "settings":
        this.sidebar.show();
        this.showSidebarView("settings");
        break;
      case "tasks":
        this.panels.open("tasks");
        this.onPanelSelected("tasks");
        break;
      case "search":
        this.panels.open("search");
        this.onPanelSelected("search");
        break;
      case "preview":
        this.togglePreview();
        break;
      case "diff":
        this.toggleDiff();
        break;
    }
  }

  private onActivityDeselected(): void {
    this.activeActivity = null;
    if (this.sidebar.isVisible()) this.sidebar.hide();
    if (this.panels.isOpen()) this.panels.close();
    if (this.preview.isVisible()) this.preview.hide();
    if (this.diffView.isVisible()) this.diffView.hide();
  }

  private showSidebarView(view: "explorer" | "outline" | "settings"): void {
    const host = document.getElementById("sidebar-host") as HTMLElement;
    host.querySelectorAll<HTMLElement>(".sidebar-view").forEach((el) => {
      el.style.display = el.dataset.view === view ? "" : "none";
    });
    this.activeActivity = view;
    if (view === "outline") {
      const state = this.getActiveState();
      if (state) this.outlinePanel.setSymbols(OutlineScanner.scan(state.content, state.language));
    }
  }

  private onPanelSelected(panel: string): void {
    const host = document.getElementById("panel-host") as HTMLElement;
    host.querySelectorAll<HTMLElement>(".panel-view").forEach((el) => {
      el.style.display = el.dataset.view === panel ? "" : "none";
    });
    this.activePanel = panel;
    if (panel === "terminal" && !this.terminalPanel.isVisible()) {
      this.terminalPanel.toggle();
    }
    void this.settings.set("bottomPanelOpen", true);
  }

  // ---------------------------------------------------------------- Preview / Diff toggles

  private togglePreview(): void {
    const visible = this.preview.toggle();
    if (visible) {
      const state = this.getActiveState();
      if (state) {
        this.preview.setContent(state.content);
        this.preview.setLanguage(state.language);
      }
      this.activityBar.setActive("preview");
    } else {
      this.activityBar.setActive(null);
    }
  }

  private toggleDiff(): void {
    const visible = this.diffView.toggle();
    if (visible) {
      const tab = this.tabManager.getActiveTab();
      if (tab) {
        this.diffView.compare(tab.savedContent, this.documentStore.getContent(tab.id), tab.language);
      }
      this.activityBar.setActive("diff");
    } else {
      this.activityBar.setActive(null);
    }
  }

  // ---------------------------------------------------------------- Editor wiring

  private onContentChange(state: EditorPaneState): void {
    this.statusbar.updateState(state);
    this.minimap3d.get(this.activePaneId)?.setContent(state.content);
  }

  private onTabDirtyChanged(tab: TabInfo): void {
    const activeId = this.documentStore.getActiveTabId();
    if (tab.id !== activeId) return;
    const state = this.documentStore.getState(tab.id);
    if (!state) return;
    this.statusbar.updateState(state);
    this.toolbar.setFileName(tab.name);
    this.updateOutline(state);
    this.updatePreview(state);
    this.minimap3d.get(this.activePaneId)?.setContent(state.content);
  }

  private onActiveTabChanged(tab: TabInfo | null): void {
    if (!tab) {
      this.toolbar.setFileName("untitled");
      this.statusbar.updateCursor(1, 1);
      return;
    }
    this.toolbar.setFileName(tab.name);
    this.toolbar.setLanguage(tab.language);
    const state = this.documentStore.getState(tab.id);
    if (state) {
      this.statusbar.updateState(state);
      this.updateOutline(state);
      this.updatePreview(state);
    }
    this.tasksPanel.setActiveFile(tab.path);
  }

  private onPaneFocus(paneId: number): void {
    this.activePaneId = paneId;
    this.tabManager.setActivePane(paneId);
    const state = this.getActiveState();
    if (state) {
      this.statusbar.updateState(state);
      this.toolbar.setLanguage(state.language);
    }
    if (this.minimapMode === "3d") {
      for (const [id, mm] of this.minimap3d) mm.setVisible(id === paneId);
    }
  }

  private getActiveState(): EditorPaneState | null {
    const id = this.documentStore.getActiveTabId();
    if (!id) return null;
    return this.documentStore.getState(id) ?? null;
  }

  private updateOutline(state: EditorPaneState): void {
    if (this.activeActivity !== "outline") return;
    if (!this.outlinePanel) return;
    this.outlinePanel.setSymbols(OutlineScanner.scan(state.content, state.language));
  }

  private updatePreview(state: EditorPaneState): void {
    if (!this.preview || !this.preview.isVisible()) return;
    if (!this.settings.get().livePreview) return;
    this.preview.setContent(state.content);
    this.preview.setLanguage(state.language);
  }

  private onThemeChanged(theme: EditorTheme): void {
    this.toolbar.setTheme(theme);
  }

  // ---------------------------------------------------------------- File operations

  private async openWorkspaceFile(path: string): Promise<void> {
    try {
      const data = await this.workspace.readBinary(path);
      if (isBinaryContent(data)) {
        this.openHexViewer(path, data);
        return;
      }
      const content = new TextDecoder().decode(data);
      const tab = this.tabManager.openPath(path, content);
      this.onActiveTabChanged(tab);
      this.editorCore.focus(this.activePaneId);
    } catch (err) {
      console.error("Open failed:", err);
    }
  }

  private async openWorkspaceFileAtLine(path: string, line: number): Promise<void> {
    await this.openWorkspaceFile(path);
    this.jumpTo(line, 1);
  }

  private async openFileDialog(): Promise<void> {
    const adapter = createFsAdapter();
    const paths = await adapter.pickFiles();
    if (!paths?.length) return;
    for (const p of paths) {
      try {
        const data = await adapter.readBinary(p);
        if (isBinaryContent(data)) {
          this.openHexViewer(p, data);
          continue;
        }
        const content = new TextDecoder().decode(data);
        const tab = this.tabManager.openPath(p, content);
        this.onActiveTabChanged(tab);
      } catch (err) {
        console.error("Open failed:", err);
      }
    }
    this.editorCore.focus(this.activePaneId);
  }

  private async openFolder(): Promise<void> {
    const ok = await this.workspace.openFolder();
    if (ok) {
      this.sidebar.show();
      this.showSidebarView("explorer");
      this.activityBar.setActive("explorer");
    }
  }

  private async saveActiveFile(): Promise<void> {
    const tab = this.tabManager.getActiveTab();
    if (!tab) return;
    if (!tab.path) {
      await this.saveActiveFileAs();
      return;
    }
    const content = this.documentStore.getContent(tab.id);
    try {
      await this.workspace.writeFile(tab.path, content);
      this.tabManager.markSaved();
      const state = this.documentStore.getState(tab.id);
      if (state) this.statusbar.updateState(state);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

  private async saveActiveFileAs(): Promise<void> {
    const tab = this.tabManager.getActiveTab();
    if (!tab) return;
    const adapter = createFsAdapter();
    const content = this.documentStore.getContent(tab.id);
    const target = await adapter.pickSaveFile(tab.name);
    if (!target) return;
    try {
      await adapter.writeFile(target, content);
      this.documentStore.markSaved(tab.id);
      const newTab = this.tabManager.openPath(target, content);
      this.tabManager.markSaved();
      if (newTab.id !== tab.id) {
        this.tabManager.closeTab(tab.id);
      }
      this.onActiveTabChanged(newTab);
    } catch (err) {
      console.error("Save As failed:", err);
    }
  }

  private newFile(): void {
    const tab = this.tabManager.createUntitled();
    this.onActiveTabChanged(tab);
    this.editorCore.focus(this.activePaneId);
  }

  private jumpTo(line: number, column: number): void {
    const editor = this.editorCore.getEditor(this.activePaneId);
    if (!editor) return;
    editor.setPosition({ lineNumber: line, column });
    editor.revealPositionInCenter({ lineNumber: line, column });
    editor.focus();
  }

  // ---------------------------------------------------------------- View operations

  private split(orientation: "horizontal" | "vertical"): void {
    this.splitView.setOrientation(orientation);
    const id = this.splitView.addPane();
    this.tabManager.setActivePane(id);
    this.activePaneId = id;
    if (this.minimapMode === "3d") this.attachMinimap(id);
    this.editorCore.focus(id);
  }

  private closePane(): void {
    if (this.splitView.getPaneCount() <= 1) return;
    this.minimap3d.get(this.activePaneId)?.destroy();
    this.minimap3d.delete(this.activePaneId);
    this.splitView.removePane(this.activePaneId);
    this.activePaneId = this.splitView.getPaneIds()[0];
    this.tabManager.setActivePane(this.activePaneId);
    this.editorCore.focus(this.activePaneId);
  }

  private setLanguage(lang: string): void {
    const tab = this.tabManager.getActiveTab();
    if (tab) {
      this.documentStore.setLanguage(tab.id, lang);
      this.toolbar.setLanguage(lang);
    }
  }

  private async setMinimapMode(mode: MinimapMode): Promise<void> {
    this.minimapMode = mode;
    this.editorCore.setMinimapMode(mode);
    await this.settings.set("minimap", mode);
    if (mode === "3d") {
      const existing = this.minimap3d.get(this.activePaneId);
      if (existing) {
        existing.setVisible(true);
      } else {
        this.attachMinimap(this.activePaneId);
      }
      const state = this.getActiveState();
      this.minimap3d.get(this.activePaneId)?.setContent(state?.content ?? "");
    } else {
      for (const [, mm] of this.minimap3d) mm.setVisible(false);
    }
  }

  private attachMinimap(paneId: number): void {
    const editor = this.editorCore.getEditor(paneId);
    const holder = editor?.getDomNode()?.parentElement;
    if (!holder) return;
    const minimap = new Minimap3D(holder, this.editorCore, paneId);
    const state = this.getActiveState();
    minimap.setContent(state?.content ?? "");
    minimap.setVisible(true);
    this.minimap3d.set(paneId, minimap);
  }

  private format(action: "bold" | "italic" | "h1" | "bullet" | "code"): void {
    const editor = this.editorCore.getEditor(this.activePaneId);
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const selection = editor.getSelection();
    if (!selection) return;
    const raw = model.getValueInRange(selection);
    const text: string = typeof raw === "string" ? raw : "";
    let replacement = text;
    switch (action) {
      case "bold":
        replacement = `**${text}**`;
        break;
      case "italic":
        replacement = `_${text}_`;
        break;
      case "h1":
        replacement = `# ${text.replace(/^#+\s*/, "")}`;
        break;
      case "bullet":
        replacement = text
          .split("\n")
          .map((l) => `- ${l}`)
          .join("\n");
        break;
      case "code":
        replacement = "```\n" + text + "\n```";
        break;
    }
    editor.executeEdits("format", [{ range: selection, text: replacement }]);
    editor.focus();
  }

  private async setTheme(theme: EditorTheme | "custom"): Promise<void> {
    if (theme === "custom") {
      const colors = this.themeManager.getCustomThemeColors();
      if (colors) {
        this.themeManager.applyCustomTheme(colors);
      } else {
        this.themeManager.applyTheme("dark");
      }
    } else {
      this.themeManager.applyTheme(theme);
    }
    await this.settings.set("theme", theme);
  }

  // ---------------------------------------------------------------- Macros / Hex

  private toggleMacroRecording(): void {
    if (this.macroRecorder.isRecording()) {
      this.macroRecorder.stopRecording();
    } else {
      this.macroRecorder.startRecording();
    }
  }

  private showMacroManager(): void {
    const existing = document.getElementById("macro-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "macro-modal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100;display:flex;align-items:center;justify-content:center;";
    const box = document.createElement("div");
    box.style.cssText = "background:var(--surface,#1e1e1e);border:1px solid var(--border,#333);border-radius:8px;padding:16px;min-width:420px;max-height:70vh;overflow:auto;color:var(--text,#ddd);";
    const title = document.createElement("h3");
    title.textContent = "宏";
    title.style.cssText = "margin:0 0 12px;font-size:14px;";
    box.appendChild(title);

    const macros = this.macroRecorder.list();
    if (macros.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "尚未录制宏。使用 Ctrl+Shift+R 开始录制。";
      empty.style.cssText = "color:var(--text-muted,#888);font-size:13px;padding:8px 0;";
      box.appendChild(empty);
    } else {
      for (const m of macros) {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border,#333);";
        const name = document.createElement("span");
        name.textContent = m.name;
        name.style.cssText = "flex:1;font-size:13px;";
        const steps = document.createElement("span");
        steps.textContent = `${m.steps.length} 步`;
        steps.style.cssText = "color:var(--text-muted,#888);font-size:12px;";
        const playBtn = document.createElement("button");
        playBtn.textContent = "播放";
        playBtn.style.cssText = "background:#0e639c;color:#fff;border:none;padding:2px 10px;cursor:pointer;font-size:12px;";
        playBtn.addEventListener("click", () => void this.macroRecorder.play(m));
        const delBtn = document.createElement("button");
        delBtn.textContent = "删除";
        delBtn.style.cssText = "background:transparent;color:#f48771;border:1px solid #f48771;padding:2px 10px;cursor:pointer;font-size:12px;";
        delBtn.addEventListener("click", () => {
          this.macroRecorder.delete(m.id);
          this.showMacroManager();
        });
        row.append(name, steps, playBtn, delBtn);
        box.appendChild(row);
      }
    }

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "关闭";
    closeBtn.style.cssText = "margin-top:12px;background:transparent;color:var(--text,#ddd);border:1px solid var(--border,#555);padding:4px 16px;cursor:pointer;";
    closeBtn.addEventListener("click", () => overlay.remove());
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  private async toggleHexView(): Promise<void> {
    if (this.hexVisible) {
      this.hexViewer.hide();
      this.hexVisible = false;
      return;
    }
    const tab = this.tabManager.getActiveTab();
    if (!tab?.path) return;
    try {
      const data = await this.workspace.readBinary(tab.path);
      this.openHexViewer(tab.path, data);
    } catch (err) {
      console.error("Hex open failed:", err);
    }
  }

  private openHexViewer(path: string, data: Uint8Array): void {
    this.currentHexPath = path;
    this.hexViewer.load(data, path.split(/[\\/]/).pop() ?? path);
    this.hexViewer.show();
    this.hexVisible = true;
  }

  private toggleTerminal(): void {
    if (this.panels.isOpen() && this.activePanel === "terminal" && this.terminalPanel.isVisible()) {
      this.panels.close();
      this.terminalPanel.toggle();
    } else {
      this.panels.open("terminal");
      this.onPanelSelected("terminal");
      this.terminalPanel.resize();
    }
  }

  layout(): void {
    this.splitView.layout();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  void app.start();
  window.addEventListener("resize", () => app.layout());
});