import { Workspace } from "../fs/Workspace";
import { FileEntry } from "../types";

interface FileTreeCallbacks {
  onOpenFile: (path: string) => void;
}

interface TreeNodeData {
  entry: FileEntry;
  element: HTMLElement;
  childrenContainer: HTMLElement | null;
  expanded: boolean;
  loaded: boolean;
}

export class FileTree {
  private container: HTMLElement;
  private workspace: Workspace;
  private callbacks: FileTreeCallbacks;
  private rootElement: HTMLElement | null = null;
  private treeNodes: Map<string, TreeNodeData> = new Map();
  private expandedPaths: Set<string> = new Set();
  private contextMenu: HTMLElement | null = null;
  private boundHandleOutsideClick: (e: MouseEvent) => void;

  constructor(container: HTMLElement, workspace: Workspace, callbacks: FileTreeCallbacks) {
    this.container = container;
    this.workspace = workspace;
    this.callbacks = callbacks;
    this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);

    this.setupEventListeners();
    void this.refresh();
  }

  private setupEventListeners(): void {
    this.workspace.on("workspace-opened", () => this.refresh());
    this.workspace.on("workspace-closed", () => this.refresh());
    this.workspace.on("workspace-changed", () => this.refresh());
    this.workspace.on("file-created", () => this.refresh());
    this.workspace.on("file-deleted", () => this.refresh());
    this.workspace.on("file-changed", () => this.refresh());
  }

  private getFileIcon(entry: FileEntry): string {
    if (entry.isDir) {
      return entry.expanded ? "▾" : "▸";
    }
    const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
    switch (ext) {
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
        return "ƒ";
      case "html":
      case "htm":
        return "⌁";
      case "css":
      case "scss":
      case "sass":
        return "#";
      case "json":
        return "{ }";
      case "md":
      case "markdown":
        return "M";
      case "py":
        return "p";
      case "rs":
        return "R";
      case "go":
        return "G";
      case "java":
        return "J";
      case "cpp":
      case "cc":
      case "cxx":
      case "c":
      case "h":
      case "hpp":
        return "C";
      default:
        return "•";
    }
  }

  private getFileIconClass(entry: FileEntry): string {
    if (entry.isDir) return "tree-icon-folder";
    const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
    return `tree-icon-${ext}` || "tree-icon-file";
  }

  private async renderNode(entry: FileEntry, parentElement: HTMLElement, depth: number = 0): Promise<HTMLElement> {
    const row = document.createElement("div");
    row.className = "tree-row panel-item";
    row.style.paddingLeft = `${8 + depth * 16}px`;
    row.dataset.path = entry.path;

    const iconSpan = document.createElement("span");
    iconSpan.className = "panel-item-icon tree-icon";
    iconSpan.textContent = this.getFileIcon(entry);
    row.appendChild(iconSpan);

    const textSpan = document.createElement("span");
    textSpan.className = "panel-item-text tree-name";
    textSpan.textContent = entry.name;
    row.appendChild(textSpan);

    if (entry.isDir) {
      const chevron = document.createElement("span");
      chevron.className = "panel-item-meta tree-chevron";
      chevron.textContent = entry.expanded ? "▾" : "▸";
      row.appendChild(chevron);
    }

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";
    childrenContainer.style.display = entry.expanded ? "block" : "none";

    const nodeData: TreeNodeData = {
      entry,
      element: row,
      childrenContainer,
      expanded: entry.expanded ?? false,
      loaded: false,
    };
    this.treeNodes.set(entry.path, nodeData);

    row.addEventListener("click", (e) => {
      e.stopPropagation();
      if (entry.isDir) {
        this.toggleExpansion(entry.path);
      } else {
        this.callbacks.onOpenFile(entry.path);
      }
    });

    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, entry);
    });

    parentElement.appendChild(row);
    parentElement.appendChild(childrenContainer);

    if (entry.expanded && entry.isDir) {
      await this.loadChildren(entry.path, childrenContainer, depth + 1);
    }

    return row;
  }

  private async loadChildren(dirPath: string, container: HTMLElement, depth: number): Promise<void> {
    const nodeData = this.treeNodes.get(dirPath);
    if (nodeData?.loaded) return;

    try {
      const entries = await this.workspace.listDir(dirPath);
      for (const entry of entries) {
        await this.renderNode(entry, container, depth);
      }
      nodeData!.loaded = true;
    } catch (error) {
      console.error("Failed to load directory:", dirPath, error);
    }
  }

  private async toggleExpansion(path: string): Promise<void> {
    const nodeData = this.treeNodes.get(path);
    if (!nodeData || !nodeData.entry.isDir) return;

    const newExpanded = !nodeData.expanded;
    nodeData.expanded = newExpanded;
    nodeData.entry.expanded = newExpanded;

    if (newExpanded) {
      this.expandedPaths.add(path);
      nodeData.childrenContainer!.style.display = "block";
      const chevron = nodeData.element.querySelector(".tree-chevron");
      if (chevron) chevron.textContent = "▾";
      const icon = nodeData.element.querySelector(".tree-icon");
      if (icon) icon.textContent = "▾";
      if (!nodeData.loaded) {
        await this.loadChildren(path, nodeData.childrenContainer!, 
          (nodeData.element.style.paddingLeft.match(/(\d+)px/) || [0, "8"])[1] as unknown as number / 16);
      }
    } else {
      this.expandedPaths.delete(path);
      nodeData.childrenContainer!.style.display = "none";
      const chevron = nodeData.element.querySelector(".tree-chevron");
      if (chevron) chevron.textContent = "▸";
      const icon = nodeData.element.querySelector(".tree-icon");
      if (icon) icon.textContent = "▸";
    }
  }

  private showContextMenu(x: number, y: number, entry: FileEntry): void {
    this.hideContextMenu();

    const menu = document.createElement("div");
    menu.className = "tree-context-menu";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const items: Array<{ label: string; action: () => void }> = [];

    if (entry.isDir) {
      items.push(
        { label: "新建文件", action: () => this.createNewFile(entry.path) },
        { label: "新建文件夹", action: () => this.createNewFolder(entry.path) }
      );
    } else {
      items.push({ label: "新建文件", action: () => this.createNewFile(entry.path) });
    }

    items.push(
      { label: "重命名", action: () => this.renameEntry(entry) },
      { label: "删除", action: () => this.deleteEntry(entry) },
      { label: "刷新", action: () => this.refresh() }
    );

    for (const item of items) {
      const btn = document.createElement("button");
      btn.className = "tree-context-menu-item";
      btn.textContent = item.label;
      btn.addEventListener("click", () => {
        item.action();
        this.hideContextMenu();
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);
    this.contextMenu = menu;

    requestAnimationFrame(() => {
      document.addEventListener("click", this.boundHandleOutsideClick);
    });
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
      document.removeEventListener("click", this.boundHandleOutsideClick);
    }
  }

  private handleOutsideClick(e: MouseEvent): void {
    if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
      this.hideContextMenu();
    }
  }

  private async createNewFile(dirPath: string): Promise<void> {
    const name = prompt("新建文件名：");
    if (!name) return;
    const path = `${dirPath}\\${name}`;
    try {
      await this.workspace.createFile(path);
    } catch (error) {
      alert(`创建文件失败：${error}`);
    }
  }

  private async createNewFolder(dirPath: string): Promise<void> {
    const name = prompt("新建文件夹名：");
    if (!name) return;
    const path = `${dirPath}\\${name}`;
    try {
      await this.workspace.createDir(path);
    } catch (error) {
      alert(`创建文件夹失败：${error}`);
    }
  }

  private async renameEntry(entry: FileEntry): Promise<void> {
    const newName = prompt("重命名为：", entry.name);
    if (!newName || newName === entry.name) return;
    const parentPath = entry.path.substring(0, entry.path.lastIndexOf("\\"));
    const newPath = `${parentPath}\\${newName}`;
    try {
      await this.workspace.rename(entry.path, newPath);
    } catch (error) {
      alert(`重命名失败：${error}`);
    }
  }

  private async deleteEntry(entry: FileEntry): Promise<void> {
    if (!confirm(`删除 "${entry.name}"？`)) return;
    try {
      await this.workspace.delete(entry.path);
    } catch (error) {
      alert(`删除失败：${error}`);
    }
  }

  private renderToolbar(): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "panel-toolbar";

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "panel-toolbar-btn";
    refreshBtn.textContent = "⟳";
    refreshBtn.title = "刷新";
    refreshBtn.addEventListener("click", () => this.refresh());
    toolbar.appendChild(refreshBtn);

    if (!this.workspace.root) {
      const openBtn = document.createElement("button");
      openBtn.className = "panel-toolbar-btn";
      openBtn.textContent = "📂";
      openBtn.title = "Open Folder";
      openBtn.addEventListener("click", async () => {
        await this.workspace.openFolder();
      });
      toolbar.appendChild(openBtn);
    }

    return toolbar;
  }

  private async renderRoot(): Promise<void> {
    this.container.innerHTML = "";
    this.treeNodes.clear();

    this.container.appendChild(this.renderToolbar());

    const list = document.createElement("div");
    list.className = "panel-list";
    this.container.appendChild(list);

    if (!this.workspace.root) {
      const empty = document.createElement("div");
      empty.className = "panel-empty";
      empty.textContent = "未打开工作区";
      list.appendChild(empty);
      return;
    }

    const rootName = this.workspace.root.split("\\").pop() || this.workspace.root;
    const rootEntry: FileEntry = {
      name: rootName,
      path: this.workspace.root,
      isDir: true,
      size: 0,
      expanded: true,
    };

    this.rootElement = await this.renderNode(rootEntry, list, 0);
    this.expandedPaths.add(this.workspace.root);
  }

  public async refresh(): Promise<void> {
    await this.renderRoot();
  }

  public destroy(): void {
    this.workspace.off("workspace-opened", () => this.refresh());
    this.workspace.off("workspace-closed", () => this.refresh());
    this.workspace.off("workspace-changed", () => this.refresh());
    this.workspace.off("file-created", () => this.refresh());
    this.workspace.off("file-deleted", () => this.refresh());
    this.workspace.off("file-changed", () => this.refresh());
    this.hideContextMenu();
  }
}