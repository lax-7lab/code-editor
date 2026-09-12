export type EditorTheme = "dark" | "light" | "ocean" | "forest" | "sunset";

export type MinimapMode = "monaco" | "3d" | "off";

export type ActivityId =
  | "explorer"
  | "outline"
  | "tasks"
  | "search"
  | "preview"
  | "diff"
  | "settings";

export type PanelId = "tasks" | "search" | "output" | "db" | "terminal";

export interface EditorPaneState {
  id: number;
  path: string | null;
  content: string;
  language: string;
  encoding: string;
  lineEndings: "LF" | "CRLF";
  isDirty: boolean;
}

export interface TabInfo {
  id: string;
  path: string | null;
  name: string;
  language: string;
  encoding: string;
  lineEndings: "LF" | "CRLF";
  isDirty: boolean;
  savedContent: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  children?: FileEntry[];
  expanded?: boolean;
}

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface TaskItem {
  path: string;
  line: number;
  tag: string;
  text: string;
}

export type OutlineSymbolKind =
  | "function"
  | "class"
  | "method"
  | "variable"
  | "interface"
  | "tag"
  | "section"
  | "other";

export interface OutlineSymbol {
  name: string;
  kind: OutlineSymbolKind;
  line: number;
  column: number;
  detail?: string;
}

export interface CommandDef {
  id: string;
  title: string;
  category?: string;
  keys?: string;
  run: () => void;
}

export interface Settings {
  theme: EditorTheme | "custom";
  fontSize: number;
  fontLigatures: boolean;
  minimap: MinimapMode;
  wordWrap: "off" | "on";
  tabSize: number;
  lastWorkspace: string | null;
  sidebarWidth: number;
  bottomPanelOpen: boolean;
  bottomPanelHeight: number;
  livePreview: boolean;
  customTheme?: Record<string, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  fontSize: 14,
  fontLigatures: true,
  minimap: "monaco",
  wordWrap: "off",
  tabSize: 4,
  lastWorkspace: null,
  sidebarWidth: 260,
  bottomPanelOpen: false,
  bottomPanelHeight: 180,
  livePreview: true,
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  backdrop: string;
  monaco: string;
  glow: string;
}

export interface MonacoThemeDef {
  name: string;
  base: "vs" | "vs-dark" | "hc-black" | "hc-light";
  colors: Record<string, string>;
  rules: Array<{ token: string; foreground: string; fontStyle?: string }>;
}