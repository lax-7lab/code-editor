import * as monaco from "monaco-editor";
import type { EditorTheme, MonacoThemeDef, ThemeColors } from "../types";

export interface CustomThemeColors {
  background: string;
  foreground: string;
  accent: string;
  selection: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
  type: string;
}

interface ThemeDefinition {
  colors: ThemeColors;
  monaco: MonacoThemeDef;
}

const THEMES: Record<EditorTheme, ThemeDefinition> = {
  dark: {
    colors: {
      background: "#0d1117",
      surface: "rgba(22, 27, 34, 0.72)",
      surfaceAlt: "rgba(13, 17, 23, 0.9)",
      accent: "#58a6ff",
      text: "#e6edf3",
      textMuted: "#8b949e",
      border: "rgba(110, 118, 129, 0.25)",
      backdrop: "rgba(13, 17, 23, 0.55)",
      monaco: "vs-dark",
      glow: "56, 166, 255",
    },
    monaco: {
      name: "aurora-dark",
      base: "vs-dark",
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#e6edf3",
        "editorLineNumber.foreground": "#484f58",
        "editorLineNumber.activeForeground": "#58a6ff",
        "editorCursor.foreground": "#58a6ff",
        "editor.selectionBackground": "#264f7899",
        "editor.inactiveSelectionBackground": "#264f7866",
        "editor.lineHighlightBackground": "#1f2733",
        "editorIndentGuide.background1": "#21262d",
        "editorIndentGuide.activeBackground1": "#484f58",
        "editorOverviewRuler.border": "#00000000",
        "scrollbarSlider.background": "#58a6ff33",
        "scrollbarSlider.hoverBackground": "#58a6ff55",
        "scrollbarSlider.activeBackground": "#58a6ff77",
        "minimap.background": "#0d111700",
        "editorWidget.background": "#161b22",
        "editorWidget.border": "#21262d",
      },
      rules: [
        { token: "", foreground: "e6edf3" },
        { token: "comment", foreground: "8b949e", fontStyle: "italic" },
        { token: "keyword", foreground: "ff7b72" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
        { token: "type", foreground: "ffa657" },
        { token: "function", foreground: "d2a8ff" },
        { token: "variable", foreground: "e6edf3" },
        { token: "tag", foreground: "7ee787" },
        { token: "attribute.name", foreground: "ffa657" },
        { token: "attribute.value", foreground: "a5d6ff" },
        { token: "delimiter", foreground: "484f58" },
        { token: "operator", foreground: "ff7b72" },
      ],
    },
  },
  light: {
    colors: {
      background: "#f6f8fa",
      surface: "rgba(255, 255, 255, 0.75)",
      surfaceAlt: "rgba(246, 248, 250, 0.95)",
      accent: "#0969da",
      text: "#1f2328",
      textMuted: "#656d76",
      border: "rgba(31, 35, 40, 0.15)",
      backdrop: "rgba(246, 248, 250, 0.6)",
      monaco: "vs",
      glow: "9, 105, 218",
    },
    monaco: {
      name: "aurora-light",
      base: "vs",
      colors: {
        "editor.background": "#f6f8fa",
        "editor.foreground": "#1f2328",
        "editorLineNumber.foreground": "#89929b",
        "editorLineNumber.activeForeground": "#0969da",
        "editorCursor.foreground": "#0969da",
        "editor.selectionBackground": "#add6ff99",
        "editor.lineHighlightBackground": "#eaeef2",
        "editorIndentGuide.background1": "#d0d7de",
        "editorIndentGuide.activeBackground1": "#afb8c1",
        "scrollbarSlider.background": "#0969da33",
        "scrollbarSlider.hoverBackground": "#0969da55",
        "scrollbarSlider.activeBackground": "#0969da77",
        "editorWidget.background": "#ffffff",
        "editorWidget.border": "#d0d7de",
      },
      rules: [
        { token: "", foreground: "1f2328" },
        { token: "comment", foreground: "656d76", fontStyle: "italic" },
        { token: "keyword", foreground: "cf222e" },
        { token: "string", foreground: "0a3069" },
        { token: "number", foreground: "0550ae" },
        { token: "type", foreground: "953800" },
        { token: "function", foreground: "8250df" },
        { token: "tag", foreground: "116329" },
        { token: "attribute.name", foreground: "953800" },
        { token: "attribute.value", foreground: "0a3069" },
      ],
    },
  },
  ocean: {
    colors: {
      background: "#0a1024",
      surface: "rgba(16, 24, 51, 0.7)",
      surfaceAlt: "rgba(10, 16, 36, 0.92)",
      accent: "#22d3ee",
      text: "#e2e8f0",
      textMuted: "#64748b",
      border: "rgba(100, 116, 139, 0.25)",
      backdrop: "rgba(10, 16, 36, 0.55)",
      monaco: "vs-dark",
      glow: "34, 211, 238",
    },
    monaco: {
      name: "aurora-ocean",
      base: "vs-dark",
      colors: {
        "editor.background": "#0a1024",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#334155",
        "editorLineNumber.activeForeground": "#22d3ee",
        "editorCursor.foreground": "#22d3ee",
        "editor.selectionBackground": "#155e7599",
        "editor.lineHighlightBackground": "#111a36",
        "editorIndentGuide.background1": "#1e293b",
        "editorIndentGuide.activeBackground1": "#475569",
        "scrollbarSlider.background": "#22d3ee33",
        "scrollbarSlider.hoverBackground": "#22d3ee55",
        "scrollbarSlider.activeBackground": "#22d3ee77",
        "editorWidget.background": "#0f172a",
      },
      rules: [
        { token: "", foreground: "e2e8f0" },
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "#f472b6" },
        { token: "string", foreground: "#a5f3fc" },
        { token: "number", foreground: "#67e8f9" },
        { token: "type", foreground: "#fdba74" },
        { token: "function", foreground: "#c084fc" },
        { token: "tag", foreground: "#86efac" },
      ],
    },
  },
  forest: {
    colors: {
      background: "#0c1410",
      surface: "rgba(17, 26, 20, 0.72)",
      surfaceAlt: "rgba(12, 20, 16, 0.92)",
      accent: "#4ade80",
      text: "#e7f0ea",
      textMuted: "#6b8b76",
      border: "rgba(107, 139, 118, 0.25)",
      backdrop: "rgba(12, 20, 16, 0.55)",
      monaco: "vs-dark",
      glow: "74, 222, 128",
    },
    monaco: {
      name: "aurora-forest",
      base: "vs-dark",
      colors: {
        "editor.background": "#0c1410",
        "editor.foreground": "#e7f0ea",
        "editorLineNumber.foreground": "#33453a",
        "editorLineNumber.activeForeground": "#4ade80",
        "editorCursor.foreground": "#4ade80",
        "editor.selectionBackground": "#16653499",
        "editor.lineHighlightBackground": "#12201a",
        "editorIndentGuide.background1": "#1f2e26",
        "editorIndentGuide.activeBackground1": "#3f5a4a",
        "scrollbarSlider.background": "#4ade8033",
        "scrollbarSlider.hoverBackground": "#4ade8055",
        "scrollbarSlider.activeBackground": "#4ade8077",
        "editorWidget.background": "#101a14",
      },
      rules: [
        { token: "", foreground: "e7f0ea" },
        { token: "comment", foreground: "6b8b76", fontStyle: "italic" },
        { token: "keyword", foreground: "#f87171" },
        { token: "string", foreground: "#bef264" },
        { token: "number", foreground: "#86efac" },
        { token: "type", foreground: "#fbbf24" },
        { token: "function", foreground: "#a7f3d0" },
        { token: "tag", foreground: "#86efac" },
      ],
    },
  },
  sunset: {
    colors: {
      background: "#1a0f0f",
      surface: "rgba(32, 18, 18, 0.72)",
      surfaceAlt: "rgba(26, 15, 15, 0.92)",
      accent: "#fb7185",
      text: "#fdf2f4",
      textMuted: "#9c7b80",
      border: "rgba(156, 123, 128, 0.25)",
      backdrop: "rgba(26, 15, 15, 0.55)",
      monaco: "vs-dark",
      glow: "251, 113, 133",
    },
    monaco: {
      name: "aurora-sunset",
      base: "vs-dark",
      colors: {
        "editor.background": "#1a0f0f",
        "editor.foreground": "#fdf2f4",
        "editorLineNumber.foreground": "#5c3b40",
        "editorLineNumber.activeForeground": "#fb7185",
        "editorCursor.foreground": "#fb7185",
        "editor.selectionBackground": "#7f1d1d99",
        "editor.lineHighlightBackground": "#291515",
        "editorIndentGuide.background1": "#3b2326",
        "editorIndentGuide.activeBackground1": "#6b4448",
        "scrollbarSlider.background": "#fb718533",
        "scrollbarSlider.hoverBackground": "#fb718555",
        "scrollbarSlider.activeBackground": "#fb718577",
        "editorWidget.background": "#241515",
      },
      rules: [
        { token: "", foreground: "fdf2f4" },
        { token: "comment", foreground: "9c7b80", fontStyle: "italic" },
        { token: "keyword", foreground: "#fbbf24" },
        { token: "string", foreground: "#fda4af" },
        { token: "number", foreground: "#fdba74" },
        { token: "type", foreground: "#f472b6" },
        { token: "function", foreground: "#e9d5ff" },
        { token: "tag", foreground: "#f0abfc" },
      ],
    },
  },
};

export class ThemeManager {
  private current: EditorTheme = "dark";
  private onThemeChangeCallbacks: Array<(theme: EditorTheme) => void> = [];
  private customColors: CustomThemeColors | null = null;

  constructor() {
    for (const [key, def] of Object.entries(THEMES)) {
      monaco.editor.defineTheme(def.monaco.name, def.monaco);
      void key;
    }
    this.applyTheme("dark");
  }

  applyTheme(theme: EditorTheme): void {
    const def = THEMES[theme];
    if (!def) return;
    this.current = theme;
    const c = def.colors;
    const root = document.documentElement;
    root.style.setProperty("--bg", c.background);
    root.style.setProperty("--surface", c.surface);
    root.style.setProperty("--surface-alt", c.surfaceAlt);
    root.style.setProperty("--accent", c.accent);
    root.style.setProperty("--text", c.text);
    root.style.setProperty("--text-muted", c.textMuted);
    root.style.setProperty("--border", c.border);
    root.style.setProperty("--backdrop", c.backdrop);
    root.style.setProperty("--glow", c.glow);
    root.style.setProperty("--monaco-theme", c.monaco);
    root.dataset.theme = theme;
    monaco.editor.setTheme(def.monaco.name);
    this.onThemeChangeCallbacks.forEach((cb) => cb(theme));
  }

  applyCustomTheme(colors: CustomThemeColors): void {
    this.customColors = colors;
    this.current = "custom" as EditorTheme;

    const root = document.documentElement;
    root.style.setProperty("--bg", colors.background);
    root.style.setProperty("--surface", colors.background);
    root.style.setProperty("--surface-alt", colors.selection);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--text", colors.foreground);
    root.style.setProperty("--text-muted", colors.comment);
    root.style.setProperty("--border", colors.selection);
    root.style.setProperty("--backdrop", colors.background);
    root.style.setProperty("--glow", colors.accent);
    root.dataset.theme = "custom";

    const monacoThemeDef: MonacoThemeDef = {
      name: "custom",
      base: "vs-dark",
      colors: {
        "editor.background": colors.background,
        "editor.foreground": colors.foreground,
        "editor.selectionBackground": colors.selection + "99",
        "editorCursor.foreground": colors.accent,
        "editorLineNumber.foreground": colors.comment,
        "editorLineNumber.activeForeground": colors.accent,
        "editor.lineHighlightBackground": colors.selection + "33",
        "editorWidget.background": colors.background,
        "editorWidget.border": colors.selection,
        "scrollbarSlider.background": colors.accent + "33",
        "scrollbarSlider.hoverBackground": colors.accent + "55",
        "scrollbarSlider.activeBackground": colors.accent + "77",
      },
      rules: [
        { token: "", foreground: colors.foreground.replace("#", "") },
        { token: "comment", foreground: colors.comment.replace("#", ""), fontStyle: "italic" },
        { token: "keyword", foreground: colors.keyword.replace("#", "") },
        { token: "string", foreground: colors.string.replace("#", "") },
        { token: "number", foreground: colors.number.replace("#", "") },
        { token: "type", foreground: colors.type.replace("#", "") },
        { token: "function", foreground: colors.function.replace("#", "") },
        { token: "variable", foreground: colors.foreground.replace("#", "") },
        { token: "tag", foreground: colors.type.replace("#", "") },
        { token: "attribute.name", foreground: colors.accent.replace("#", "") },
        { token: "attribute.value", foreground: colors.string.replace("#", "") },
        { token: "delimiter", foreground: colors.foreground.replace("#", "") },
        { token: "operator", foreground: colors.keyword.replace("#", "") },
      ],
    };

    monaco.editor.defineTheme("custom", monacoThemeDef);
    monaco.editor.setTheme("custom");
    this.onThemeChangeCallbacks.forEach((cb) => cb("custom" as EditorTheme));
  }

  getCustomThemeColors(): CustomThemeColors | null {
    return this.customColors;
  }

  isCustomTheme(): boolean {
    return this.current === ("custom" as EditorTheme);
  }

  currentMonacoTheme(): string {
    if (this.current === ("custom" as EditorTheme)) return "custom";
    return THEMES[this.current].monaco.name;
  }

  getTheme(): EditorTheme {
    return this.current;
  }

  getColors(): ThemeColors {
    if (this.current === ("custom" as EditorTheme) && this.customColors) {
      return {
        background: this.customColors.background,
        surface: this.customColors.background,
        surfaceAlt: this.customColors.selection,
        accent: this.customColors.accent,
        text: this.customColors.foreground,
        textMuted: this.customColors.comment,
        border: this.customColors.selection,
        backdrop: this.customColors.background,
        monaco: "vs-dark",
        glow: this.customColors.accent,
      };
    }
    return THEMES[this.current].colors;
  }

  static getThemeList(): EditorTheme[] {
    return Object.keys(THEMES) as EditorTheme[];
  }

  static getThemeListWithCustom(): Array<EditorTheme | "custom"> {
    return [...(Object.keys(THEMES) as EditorTheme[]), "custom"];
  }

  static getThemeLabel(theme: EditorTheme | "custom"): string {
    const labels: Record<string, string> = {
      dark: "深色",
      light: "浅色",
      ocean: "海洋",
      forest: "森林",
      sunset: "日落",
      custom: "自定义",
    };
    return labels[theme] ?? theme;
  }

  onChange(cb: (theme: EditorTheme) => void): void {
    this.onThemeChangeCallbacks.push(cb);
  }
}