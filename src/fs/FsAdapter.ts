import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { FileEntry } from "../types";

export type { FileEntry } from "../types";

export interface FsAdapter {
  isNative(): boolean;
  pickFolder(): Promise<string | null>;
  pickFiles(): Promise<string[] | null>;
  pickSaveFile(defaultName: string): Promise<string | null>;
  listDir(path: string): Promise<FileEntry[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readBinary(path: string): Promise<Uint8Array>;
  writeBinary(path: string, data: Uint8Array): Promise<void>;
  createFile(path: string): Promise<void>;
  createDir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export class TauriFsAdapter implements FsAdapter {
  isNative(): boolean {
    return true;
  }

  async pickFolder(): Promise<string | null> {
    const result = await open({ directory: true, multiple: false });
    if (!result) return null;
    return Array.isArray(result) ? result[0] : result;
  }

  async pickFiles(): Promise<string[] | null> {
    const result = await open({ multiple: true });
    if (!result) return null;
    return Array.isArray(result) ? result : [result];
  }

  async pickSaveFile(defaultName: string): Promise<string | null> {
    const result = await save({ defaultPath: defaultName });
    return result ?? null;
  }

  async listDir(path: string): Promise<FileEntry[]> {
    const entries = await invoke<{ name: string; path: string; is_dir: boolean; size: number }[]>(
      "list_dir",
      { path }
    );
    return entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDir: entry.is_dir,
      size: entry.size,
      expanded: false,
    }));
  }

  async readFile(path: string): Promise<string> {
    return await invoke("read_text_file", { path });
  }

  async readBinary(path: string): Promise<Uint8Array> {
    return await readFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await invoke("write_text_file", { path, content });
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    await writeFile(path, data);
  }

  async createFile(path: string): Promise<void> {
    await invoke("create_file", { path });
  }

  async createDir(path: string): Promise<void> {
    await invoke("create_dir", { path });
  }

  async rename(from: string, to: string): Promise<void> {
    await invoke("rename_entry", { from, to });
  }

  async delete(path: string): Promise<void> {
    await invoke("delete_entry", { path });
  }

  async exists(path: string): Promise<boolean> {
    try {
      const parentPath = path.split(/[\\/]/).slice(0, -1).join("\\") || ".";
      const entries = await this.listDir(parentPath);
      return entries.some((entry) => entry.path === path);
    } catch {
      return false;
    }
  }
}

export class BrowserFsAdapter implements FsAdapter {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private fileHandles: Map<string, FileSystemFileHandle> = new Map();

  isNative(): boolean {
    return false;
  }

  async pickFolder(): Promise<string | null> {
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      return null;
    }
    try {
      const handle = await (window as any).showDirectoryPicker();
      this.dirHandle = handle;
      return handle.name;
    } catch {
      return null;
    }
  }

  async pickFiles(): Promise<string[] | null> {
    if (typeof window === "undefined" || !("showOpenFilePicker" in window)) {
      return null;
    }
    try {
      const handles = await (window as any).showOpenFilePicker({ multiple: true });
      for (const handle of handles) {
        this.fileHandles.set(handle.name, handle);
      }
      return handles.map((h: FileSystemFileHandle) => h.name);
    } catch {
      return null;
    }
  }

  async pickSaveFile(defaultName: string): Promise<string | null> {
    if (typeof window === "undefined" || !("showSaveFilePicker" in window)) {
      return null;
    }
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: defaultName });
      this.fileHandles.set(handle.name, handle);
      return handle.name;
    } catch {
      return null;
    }
  }

  async listDir(path: string): Promise<FileEntry[]> {
    if (!this.dirHandle) return [];

    const entries: FileEntry[] = [];
    try {
      for await (const handle of this.dirHandle as any) {
        const isDir = handle.kind === "directory";
        entries.push({
          name: handle.name,
          path: handle.name,
          isDir,
          size: 0,
          expanded: false,
        });
        if (!isDir) {
          this.fileHandles.set(handle.name, handle as FileSystemFileHandle);
        }
      }
    } catch {
      return [];
    }
    return entries;
  }

  async readFile(path: string): Promise<string> {
    const handle = this.fileHandles.get(path);
    if (!handle) {
      if (this.dirHandle) {
        try {
          const fileHandle = await this.dirHandle.getFileHandle(path);
          this.fileHandles.set(path, fileHandle);
          const file = await fileHandle.getFile();
          return await file.text();
        } catch {
          throw new Error(`File not accessible in browser mode: ${path}`);
        }
      }
      throw new Error(`File not accessible in browser mode: ${path}`);
    }
    const file = await handle.getFile();
    return await file.text();
  }

  async readBinary(path: string): Promise<Uint8Array> {
    const handle = this.fileHandles.get(path);
    if (!handle) {
      if (this.dirHandle) {
        try {
          const fileHandle = await this.dirHandle.getFileHandle(path);
          this.fileHandles.set(path, fileHandle);
          const file = await fileHandle.getFile();
          const buf = await file.arrayBuffer();
          return new Uint8Array(buf);
        } catch {
          throw new Error(`File not accessible in browser mode: ${path}`);
        }
      }
      throw new Error(`File not accessible in browser mode: ${path}`);
    }
    const file = await handle.getFile();
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }

  async writeFile(path: string, content: string): Promise<void> {
    let handle = this.fileHandles.get(path);
    if (!handle) {
      if (!this.dirHandle) {
        throw new Error(`Cannot write file in browser mode without directory handle: ${path}`);
      }
      try {
        handle = await this.dirHandle.getFileHandle(path, { create: true });
        this.fileHandles.set(path, handle);
      } catch {
        throw new Error(`Cannot create file in browser mode: ${path}`);
      }
    }
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    let handle = this.fileHandles.get(path);
    if (!handle) {
      if (!this.dirHandle) {
        throw new Error(`Cannot write file in browser mode without directory handle: ${path}`);
      }
      try {
        handle = await this.dirHandle.getFileHandle(path, { create: true });
        this.fileHandles.set(path, handle);
      } catch {
        throw new Error(`Cannot create file in browser mode: ${path}`);
      }
    }
    const writable = await handle.createWritable();
    await writable.write(data.buffer as ArrayBuffer);
    await writable.close();
  }

  async createFile(path: string): Promise<void> {
    if (!this.dirHandle) {
      throw new Error("Cannot create file in browser mode without directory handle");
    }
    try {
      const handle = await this.dirHandle.getFileHandle(path, { create: true });
      this.fileHandles.set(path, handle);
    } catch {
      throw new Error(`Failed to create file in browser mode: ${path}`);
    }
  }

  async createDir(path: string): Promise<void> {
    if (!this.dirHandle) {
      throw new Error("Cannot create directory in browser mode without directory handle");
    }
    try {
      await this.dirHandle.getDirectoryHandle(path, { create: true });
    } catch {
      throw new Error(`Failed to create directory in browser mode: ${path}`);
    }
  }

  async rename(from: string, to: string): Promise<void> {
    throw new Error("Rename not supported in browser mode");
  }

  async delete(path: string): Promise<void> {
    throw new Error("Delete not supported in browser mode");
  }

  async exists(path: string): Promise<boolean> {
    if (this.fileHandles.has(path)) return true;
    if (!this.dirHandle) return false;
    try {
      await this.dirHandle.getFileHandle(path);
      return true;
    } catch {
      try {
        await this.dirHandle.getDirectoryHandle(path);
        return true;
      } catch {
        return false;
      }
    }
  }
}

export function createFsAdapter(): FsAdapter {
  if (
    typeof window !== "undefined" &&
    (window as any).__TAURI_INTERNALS__
  ) {
    return new TauriFsAdapter();
  }
  return new BrowserFsAdapter();
}