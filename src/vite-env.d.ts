/// <reference types="vite/client" />

declare module "*?worker" {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}

interface MonacoEnvironmentShim {
  getWorker(workerId: string, label: string): Worker;
}

interface Window {
  MonacoEnvironment?: MonacoEnvironmentShim;
}

interface FileSystemFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  queryPermission?(descriptor?: unknown): Promise<PermissionState>;
  requestPermission?(descriptor?: unknown): Promise<PermissionState>;
}

interface FileSystemWritableFileStream {
  write(data: string | Blob | BufferSource): Promise<void>;
  close(): Promise<void>;
}

interface Window {
  showOpenFilePicker?(options?: object): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?(options?: object): Promise<FileSystemFileHandle>;
}