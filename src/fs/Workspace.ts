import { FsAdapter } from "./FsAdapter";
import { FileEntry } from "../types";

type WorkspaceEvent =
  | "workspace-opened"
  | "workspace-closed"
  | "workspace-changed"
  | "file-created"
  | "file-deleted"
  | "file-changed";

type EventCallback = (path: string | null) => void;

export class Workspace {
  root: string | null = null;
  adapter: FsAdapter;
  private dirCache: Map<string, FileEntry[]> = new Map();
  private listeners: Map<WorkspaceEvent, Set<EventCallback>> = new Map();

  constructor(adapter: FsAdapter) {
    this.adapter = adapter;
  }

  on(event: WorkspaceEvent, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: WorkspaceEvent, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: WorkspaceEvent, path: string | null): void {
    this.listeners.get(event)?.forEach((cb) => cb(path));
  }

  async openFolder(): Promise<boolean> {
    const folder = await this.adapter.pickFolder();
    if (!folder) return false;
    this.root = folder;
    this.dirCache.clear();
    this.emit("workspace-opened", null);
    return true;
  }

  async refresh(): Promise<void> {
    this.dirCache.clear();
    this.emit("workspace-changed", null);
  }

  async listDir(path: string): Promise<FileEntry[]> {
    if (this.dirCache.has(path)) {
      return this.dirCache.get(path)!;
    }
    const entries = await this.adapter.listDir(path);
    this.dirCache.set(path, entries);
    if (path === this.root && entries.length > 0) {
      this.emit("workspace-changed", null);
    }
    return entries;
  }

  async readFile(path: string): Promise<string> {
    return await this.adapter.readFile(path);
  }

  async readBinary(path: string): Promise<Uint8Array> {
    return await this.adapter.readBinary(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.adapter.writeFile(path, content);
    this.clearParentCache(path);
    this.emit("file-changed", path);
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    await this.adapter.writeBinary(path, data);
    this.clearParentCache(path);
    this.emit("file-changed", path);
  }

  async createFile(path: string): Promise<void> {
    await this.adapter.createFile(path);
    this.clearParentCache(path);
    this.emit("file-created", path);
  }

  async createDir(path: string): Promise<void> {
    await this.adapter.createDir(path);
    this.clearParentCache(path);
    this.emit("file-created", path);
  }

  async rename(from: string, to: string): Promise<void> {
    await this.adapter.rename(from, to);
    this.clearParentCache(from);
    this.clearParentCache(to);
    this.emit("file-changed", to);
  }

  async delete(path: string): Promise<void> {
    await this.adapter.delete(path);
    this.clearParentCache(path);
    this.emit("file-deleted", path);
  }

  isNative(): boolean {
    return this.adapter.isNative();
  }

  closeWorkspace(): void {
    this.root = null;
    this.dirCache.clear();
    this.emit("workspace-closed", null);
  }

  private clearParentCache(path: string): void {
    const parentPath = path.split(/[\\/]/).slice(0, -1).join("\\") || ".";
    this.dirCache.delete(parentPath);
    this.dirCache.delete(path);
  }
}