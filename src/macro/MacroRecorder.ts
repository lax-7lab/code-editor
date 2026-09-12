import { EditorCore } from "../editor/EditorCore";

export interface MacroStep {
  type: "text" | "key";
  text?: string;
  key?: string;
}

export interface Macro {
  id: string;
  name: string;
  steps: MacroStep[];
  createdAt: number;
}

const STORAGE_KEY = "editrocket.macros";
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta", "CapsLock"]);

export function keyToCommand(key: string): { command: string; text?: string } | null {
  switch (key) {
    case "Enter":
      return { command: "type", text: "\n" };
    case "Backspace":
      return { command: "deleteLeft" };
    case "Delete":
      return { command: "deleteRight" };
    case "Tab":
      return { command: "tab" };
    case "ArrowUp":
      return { command: "cursorUp" };
    case "ArrowDown":
      return { command: "cursorDown" };
    case "ArrowLeft":
      return { command: "cursorLeft" };
    case "ArrowRight":
      return { command: "cursorRight" };
    case "Home":
      return { command: "cursorHome" };
    case "End":
      return { command: "cursorEnd" };
    case "PageUp":
      return { command: "cursorPageUp" };
    case "PageDown":
      return { command: "cursorPageDown" };
    case "Escape":
      return { command: "hideSuggestWidget" };
    default:
      if (key.length === 1) {
        return { command: "type", text: key };
      }
      return null;
  }
}

export class MacroRecorder {
  private editorCore: EditorCore;
  private getActivePaneId: () => number;
  private recording = false;
  private steps: MacroStep[] = [];
  private keydownDisposable: { dispose(): void } | null = null;
  private onRecordedCallback: ((macro: Macro) => void) | null = null;
  private onStateChangeCallback: ((recording: boolean) => void) | null = null;

  constructor(editorCore: EditorCore, getActivePaneId: () => number) {
    this.editorCore = editorCore;
    this.getActivePaneId = getActivePaneId;
  }

  startRecording(): void {
    if (this.recording) return;

    const paneId = this.getActivePaneId();
    const editor = this.editorCore.getEditor(paneId);
    if (!editor) return;

    this.steps = [];
    this.recording = true;

    this.keydownDisposable = editor.onKeyDown((e: { key: string; code: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }) => {
      const { key, ctrlKey, metaKey, altKey } = e;

      if ((ctrlKey || metaKey || altKey) && MODIFIER_KEYS.has(key)) {
        return;
      }

      if (MODIFIER_KEYS.has(key)) {
        return;
      }

      if (key.length === 1) {
        this.steps.push({ type: "text", text: key });
      } else {
        this.steps.push({ type: "key", key });
      }
    });

    this.fireStateChange(true);
  }

  stopRecording(): Macro | null {
    if (!this.recording) return null;

    this.keydownDisposable?.dispose();
    this.keydownDisposable = null;
    this.recording = false;

    this.fireStateChange(false);

    if (this.steps.length === 0) {
      this.steps = [];
      return null;
    }

    const macros = this.load();
    const macro: Macro = {
      id: `macro-${Date.now()}`,
      name: `Macro ${macros.length + 1}`,
      steps: [...this.steps],
      createdAt: Date.now(),
    };

    macros.push(macro);
    this.persist(macros);
    this.steps = [];

    this.fireRecorded(macro);
    return macro;
  }

  isRecording(): boolean {
    return this.recording;
  }

  async play(macro: Macro): Promise<void> {
    for (const step of macro.steps) {
      const paneId = this.getActivePaneId();
      const editor = this.editorCore.getEditor(paneId);
      if (!editor) return;

      if (step.type === "text" && step.text) {
        editor.trigger("macro", "type", { text: step.text });
      } else if (step.type === "key" && step.key) {
        const cmd = keyToCommand(step.key);
        if (cmd) {
          if (cmd.text !== undefined) {
            editor.trigger("macro", cmd.command, { text: cmd.text });
          } else {
            editor.trigger("macro", cmd.command, null);
          }
        }
      }

      await new Promise((r) => setTimeout(r, 30));
    }
  }

  save(name: string): Macro | null {
    const macros = this.list();
    if (macros.length === 0) return null;

    const last = macros[macros.length - 1];
    last.name = name;
    this.persist(macros);
    return last;
  }

  list(): Macro[] {
    return this.load();
  }

  delete(id: string): void {
    const macros = this.load().filter((m) => m.id !== id);
    this.persist(macros);
  }

  getLast(): Macro | null {
    const macros = this.list();
    return macros.length > 0 ? macros[macros.length - 1] : null;
  }

  onRecorded(cb: (macro: Macro) => void): void {
    this.onRecordedCallback = cb;
  }

  onStateChange(cb: (recording: boolean) => void): void {
    this.onStateChangeCallback = cb;
  }

  dispose(): void {
    this.keydownDisposable?.dispose();
    this.keydownDisposable = null;
    this.recording = false;
    this.steps = [];
  }

  private fireRecorded(macro: Macro): void {
    this.onRecordedCallback?.(macro);
  }

  private fireStateChange(recording: boolean): void {
    this.onStateChangeCallback?.(recording);
  }

  private load(): Macro[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist(macros: Macro[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(macros));
    } catch {
      // ignore
    }
  }
}