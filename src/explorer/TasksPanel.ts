import { Workspace } from "../fs/Workspace";
import { TaskItem, FileEntry } from "../types";

interface TasksPanelCallbacks {
  onOpenFile: (path: string, line: number) => void;
}

const TASK_TAGS = ["TODO", "FIXME", "HACK", "XXX", "BUG"] as const;
type TaskTag = (typeof TASK_TAGS)[number];

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "target", ".vscode", ".idea", "out", "coverage"]);
const SKIP_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "ico", "woff", "woff2", "ttf", "eot", "zip", "gz", "tar", "exe", "dll", "obj", "bin", "wasm", "map", "min.js", "min.css"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const TAG_COLORS: Record<TaskTag, string> = {
  TODO: "var(--accent)",
  FIXME: "#f0883e",
  HACK: "#c084fc",
  XXX: "#f85149",
  BUG: "#f85149",
};

export class TasksPanel {
  private container: HTMLElement;
  private workspace: Workspace;
  private callbacks: TasksPanelCallbacks;
  private listElement: HTMLElement | null = null;
  private activeFile: string | null = null;
  private statusElement: HTMLElement | null = null;
  private isScanning = false;

  constructor(container: HTMLElement, workspace: Workspace, callbacks: TasksPanelCallbacks) {
    this.container = container;
    this.workspace = workspace;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    const toolbar = document.createElement("div");
    toolbar.className = "panel-toolbar";

    const scanBtn = document.createElement("button");
    scanBtn.className = "panel-toolbar-btn";
    scanBtn.textContent = "扫描工作区";
    scanBtn.addEventListener("click", () => this.runScan());
    toolbar.appendChild(scanBtn);

    this.statusElement = document.createElement("span");
    this.statusElement.className = "panel-toolbar-btn";
    this.statusElement.style.cursor = "default";
    this.statusElement.textContent = this.workspace.root ? "就绪" : "打开工作区后可扫描";
    toolbar.appendChild(this.statusElement);

    this.container.appendChild(toolbar);

    this.listElement = document.createElement("div");
    this.listElement.className = "panel-list";
    this.container.appendChild(this.listElement);

    this.updateEmptyState();
  }

  private updateEmptyState(): void {
    if (!this.listElement) return;
    if (this.listElement.children.length === 0) {
      const empty = document.createElement("div");
      empty.className = "panel-empty";
      empty.textContent = this.workspace.root ? "未找到任务" : "打开工作区后可扫描";
      this.listElement.appendChild(empty);
    }
  }

  public setActiveFile(path: string | null): void {
    this.activeFile = path;
  }

  public async runScan(): Promise<void> {
    if (this.isScanning || !this.workspace.root) return;
    this.isScanning = true;

    if (this.statusElement) {
      this.statusElement.textContent = "正在扫描…";
    }

    if (this.listElement) {
      this.listElement.innerHTML = "";
    }

    const results: TaskItem[] = [];

    try {
      if (this.activeFile) {
        await this.scanFile(this.activeFile, results);
      }

      await this.scanWorkspace(this.workspace.root, results);
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      this.isScanning = false;
      this.renderResults(results);
      if (this.statusElement) {
        this.statusElement.textContent = `找到 ${results.length} 个任务`;
      }
    }
  }

  private async scanWorkspace(dirPath: string, results: TaskItem[]): Promise<void> {
    try {
      const entries = await this.workspace.listDir(dirPath);
      for (const entry of entries) {
        if (entry.isDir) {
          if (SKIP_DIRS.has(entry.name)) continue;
          await this.scanWorkspace(entry.path, results);
        } else {
          if (this.shouldSkipFile(entry.name)) continue;
          await this.scanFile(entry.path, results);
        }
      }
    } catch (error) {
      console.error("Failed to scan directory:", dirPath, error);
    }
  }

  private shouldSkipFile(fileName: string): boolean {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (SKIP_EXTS.has(ext)) return true;
    if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css")) return true;
    return false;
  }

  private async scanFile(filePath: string, results: TaskItem[]): Promise<void> {
    try {
      const stat = await this.getFileSize(filePath);
      if (stat > MAX_FILE_SIZE) return;

      const content = await this.workspace.readFile(filePath);
      const lines = content.split(/\r?\n/);

      const tagPattern = new RegExp(`\\b(${TASK_TAGS.join("|")})\\b`, "gi");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        while ((match = tagPattern.exec(line)) !== null) {
          const tag = match[1].toUpperCase() as TaskTag;
          if (TASK_TAGS.includes(tag)) {
            results.push({
              path: filePath,
              line: i + 1,
              tag,
              text: line.trim(),
            });
          }
        }
      }
    } catch (error) {
      // Skip unreadable files
    }
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

  private renderResults(results: TaskItem[]): void {
    if (!this.listElement) return;
    this.listElement.innerHTML = "";

    if (results.length === 0) {
      this.updateEmptyState();
      return;
    }

    for (const task of results) {
      const item = document.createElement("div");
      item.className = "panel-item";
      item.title = task.path;

      const iconSpan = document.createElement("span");
      iconSpan.className = "panel-item-icon";
      iconSpan.textContent = "●";
      iconSpan.style.color = TAG_COLORS[task.tag as keyof typeof TAG_COLORS] || "var(--accent)";
      item.appendChild(iconSpan);

      const textSpan = document.createElement("span");
      textSpan.className = "panel-item-text";
      textSpan.textContent = task.text;
      item.appendChild(textSpan);

      const metaSpan = document.createElement("span");
      metaSpan.className = "panel-item-meta";
      const fileName = task.path.split("\\").pop() || task.path;
      metaSpan.textContent = `${fileName}:${task.line} [${task.tag}]`;
      item.appendChild(metaSpan);

      item.addEventListener("click", () => {
        this.callbacks.onOpenFile(task.path, task.line);
      });

      this.listElement!.appendChild(item);
    }
  }

  public clear(): void {
    if (this.listElement) {
      this.listElement.innerHTML = "";
      this.updateEmptyState();
    }
    if (this.statusElement) {
      this.statusElement.textContent = this.workspace.root ? "就绪" : "打开工作区后可扫描";
    }
  }
}