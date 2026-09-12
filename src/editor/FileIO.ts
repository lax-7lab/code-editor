import { createFsAdapter } from "../fs/FsAdapter";
import { formatBytes, detectLanguage } from "../util";

export interface LoadedFile {
  name: string;
  path: string;
  content: string;
  size: number;
}

export interface FileOk {
  ok: true;
  handle: FileSystemFileHandle | null;
  name: string;
}

export interface FileError {
  ok: false;
  error: string;
}

export type FileResult = FileOk | FileError;

function basename(pathStr: string): string {
  return pathStr.split(/[\\/]/).pop() ?? pathStr;
}

export async function openFile(): Promise<LoadedFile | null> {
  const adapter = createFsAdapter();
  const paths = await adapter.pickFiles();
  if (!paths?.length) return null;
  const content = await adapter.readFile(paths[0]);
  return {
    name: basename(paths[0]),
    path: paths[0],
    content,
    size: content.length,
  };
}

export async function saveFile(
  pathStr: string,
  content: string,
  _handle?: FileSystemFileHandle
): Promise<FileResult> {
  const adapter = createFsAdapter();
  try {
    await adapter.writeFile(pathStr, content);
    return { ok: true, handle: null, name: basename(pathStr) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export { formatBytes, detectLanguage };