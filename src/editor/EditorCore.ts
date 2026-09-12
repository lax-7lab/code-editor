import * as monaco from "monaco-editor";
import { ThemeManager } from "../ui/ThemeManager";
import type { EditorPaneState, MinimapMode } from "../types";
import { detectLanguage, detectLineEndings } from "../util";
import { OutlineScanner } from "./OutlineScanner";

export interface EditorCoreCallbacks {
  onCursorPosition: (line: number, col: number) => void;
  onLanguageChange: (language: string) => void;
  onContentChange: (state: EditorPaneState) => void;
  onPaneFocus: (paneId: number) => void;
}

export class EditorCore {
  private editors: Map<number, monaco.editor.IStandaloneCodeEditor> = new Map();
  private states: Map<number, EditorPaneState> = new Map();
  private themeManager: ThemeManager;
  private callbacks: EditorCoreCallbacks;
  private nextPaneId = 0;
  private wordWrapEnabled = false;
  private minimapEnabled = true;

  constructor(callbacks: EditorCoreCallbacks, themeManager?: ThemeManager) {
    this.callbacks = callbacks;
    this.themeManager = themeManager ?? new ThemeManager();
  }

  createPane(container: HTMLElement, initialContent = ""): number {
    const id = this.nextPaneId++;
    const state: EditorPaneState = {
      id,
      path: null,
      content: initialContent,
      language: "plaintext",
      encoding: "UTF-8",
      lineEndings: "LF",
      isDirty: false,
    };
    this.states.set(id, state);

    const editor = monaco.editor.create(container, {
      value: initialContent,
      language: "plaintext",
      theme: this.themeManager.currentMonacoTheme(),
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontLigatures: true,
      lineNumbers: "on",
      wordWrap: "off",
      minimap: { enabled: true, renderCharacters: false },
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 12, bottom: 12 },
      renderLineHighlight: "all",
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
        verticalSliderSize: 6,
        horizontalSliderSize: 6,
      },
      folding: true,
      foldingHighlight: true,
      showFoldingControls: "always",
      breadcrumbs: { enabled: true, height: 22 },
      links: true,
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      tabCompletion: "on",
      wordBasedSuggestions: "currentDocument",
      matchBrackets: "always",
      renderWhitespace: "selection",
      unicodeHighlight: { ambiguousCharacters: false },
      stickyScroll: { enabled: true },
      multiCursorModifier: "alt",
      autoClosingBrackets: "languageDefined",
      formatOnPaste: true,
      formatOnType: true,
      linkedEditing: true,
      mouseWheelZoom: true,
      cursorSurroundingLines: 4,
    });

    editor.onDidChangeCursorPosition((e: any) => {
      this.callbacks.onCursorPosition(e.position.lineNumber, e.position.column);
    });

    editor.onDidFocusEditorText(() => {
      this.callbacks.onPaneFocus(id);
    });

    editor.onDidChangeModelLanguage((e: any) => {
      const s = this.states.get(id);
      if (s) {
        s.language = e.newLanguage;
        this.callbacks.onLanguageChange(e.newLanguage);
      }
    });

    editor.getModel()?.onDidChangeContent(() => {
      const s = this.states.get(id);
      if (s) {
        s.content = editor.getValue();
        s.lineEndings = detectLineEndings(s.content);
        s.isDirty = true;
        this.callbacks.onContentChange(s);
      }
    });

    this.editors.set(id, editor);
    return id;
  }

  getEditor(id: number): monaco.editor.IStandaloneCodeEditor | undefined {
    return this.editors.get(id);
  }

  getState(id: number): EditorPaneState | undefined {
    return this.states.get(id);
  }

  disposePane(id: number): void {
    const editor = this.editors.get(id);
    if (editor) {
      editor.getModel()?.dispose();
      editor.dispose();
      this.editors.delete(id);
      this.states.delete(id);
    }
  }

  setLanguage(id: number, language: string): void {
    const editor = this.editors.get(id);
    const state = this.states.get(id);
    if (editor && state) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
        state.language = language;
      }
    }
  }

  setContent(id: number, content: string): void {
    const editor = this.editors.get(id);
    const state = this.states.get(id);
    if (editor && state) {
      editor.setValue(content);
      state.content = content;
      state.isDirty = false;
    }
  }

  loadFile(id: number, path: string, content: string): void {
    const editor = this.editors.get(id);
    const state = this.states.get(id);
    if (editor && state) {
      editor.setValue(content);
      state.path = path;
      state.content = content;
      state.isDirty = false;
      state.encoding = detectEncoding(content);
      state.language = detectLanguage(path);
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, state.language);
      }
    }
  }

  getContent(id: number): string {
    const state = this.states.get(id);
    return state ? state.content : "";
  }

  setMinimapMode(mode: MinimapMode): void {
    for (const editor of this.editors.values()) {
      editor.updateOptions({
        minimap: { enabled: mode === "monaco", renderCharacters: false },
      });
    }
  }

  layoutAll(): void {
    for (const editor of this.editors.values()) {
      editor.layout();
    }
  }

  setAllThemes(theme: string): void {
    monaco.editor.setTheme(theme);
  }

  applyMonacoTheme(): void {
    const theme = this.themeManager.currentMonacoTheme();
    this.setAllThemes(theme);
  }

  focus(id: number): void {
    this.editors.get(id)?.focus();
  }

  setModel(id: number, model: monaco.editor.ITextModel | null): void {
    const editor = this.editors.get(id);
    if (editor) {
      editor.setModel(model);
      const state = this.states.get(id);
      if (state && model) {
        state.path = model.uri?.fsPath ?? null;
        state.content = model.getValue();
        state.language = model.getLanguageId();
        state.lineEndings = detectLineEndings(state.content);
        state.isDirty = false;
      } else if (state) {
        state.path = null;
        state.content = "";
        state.language = "plaintext";
        state.lineEndings = "LF";
        state.isDirty = false;
      }
    }
  }

  async formatDocument(id: number): Promise<void> {
    const editor = this.editors.get(id);
    if (editor) {
      const action = editor.getAction("editor.action.formatDocument");
      if (action) {
        await action.run();
      }
    }
  }

  getSymbols(id: number): import("../types").OutlineSymbol[] {
    const state = this.states.get(id);
    const editor = this.editors.get(id);
    if (!state || !editor) return [];
    const model = editor.getModel();
    if (!model) return [];
    return OutlineScanner.scan(model.getValue(), state.language);
  }

  triggerCommand(id: number, commandId: string): void {
    const editor = this.editors.get(id);
    if (editor) {
      editor.trigger("command", commandId, null);
    }
  }

  addCursorAbove(id: number): void {
    this.triggerCommand(id, "editor.action.insertCursorAbove");
  }

  addCursorBelow(id: number): void {
    this.triggerCommand(id, "editor.action.insertCursorBelow");
  }

  selectAllOccurrences(id: number): void {
    this.triggerCommand(id, "editor.action.selectAllOccurrences");
  }

  addSelectionToNextFindMatch(id: number): void {
    this.triggerCommand(id, "editor.action.addSelectionToNextFindMatch");
  }

  foldAll(id: number): void {
    this.triggerCommand(id, "editor.foldAll");
  }

  unfoldAll(id: number): void {
    this.triggerCommand(id, "editor.unfoldAll");
  }

  toggleFold(id: number): void {
    this.triggerCommand(id, "editor.toggleFold");
  }

  toggleWordWrap(): void {
    this.wordWrapEnabled = !this.wordWrapEnabled;
    for (const editor of this.editors.values()) {
      editor.updateOptions({
        wordWrap: this.wordWrapEnabled ? "on" : "off",
      });
    }
  }

  toggleMinimap(): void {
    this.minimapEnabled = !this.minimapEnabled;
    for (const editor of this.editors.values()) {
      editor.updateOptions({
        minimap: { enabled: this.minimapEnabled, renderCharacters: false },
      });
    }
  }
}

function detectEncoding(content: string): string {
  const hasBom = content.charCodeAt(0) === 0xfeff;
  return hasBom ? "UTF-8 with BOM" : "UTF-8";
}