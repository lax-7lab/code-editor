import * as monaco from "monaco-editor";

export class DiffView {
  private container: HTMLElement;
  private diffEditor: monaco.editor.IDiffEditor | null = null;
  private originalModel: monaco.editor.ITextModel | null = null;
  private modifiedModel: monaco.editor.ITextModel | null = null;
  private visible: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.style.display = "none";
    this.container.style.position = "relative";
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.overflow = "hidden";
  }

  show(): void {
    this.visible = true;
    this.container.style.display = "block";
    if (this.diffEditor) {
      this.diffEditor.layout();
    }
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = "none";
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): boolean {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }

  compare(original: string, modified: string, language: string): void {
    this.disposeModels();

    if (!this.diffEditor) {
      this.diffEditor = monaco.editor.createDiffEditor(this.container, {
        automaticLayout: true,
        readOnly: true,
        renderSideBySide: true,
        originalEditable: false,
        theme: "vs-dark",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
      });
    }

    this.originalModel = monaco.editor.createModel(
      original,
      language,
      monaco.Uri.parse("diff://original")
    );
    this.modifiedModel = monaco.editor.createModel(
      modified,
      language,
      monaco.Uri.parse("diff://modified")
    );

    this.diffEditor.setModel({
      original: this.originalModel,
      modified: this.modifiedModel,
    });
  }

  private disposeModels(): void {
    if (this.originalModel) {
      this.originalModel.dispose();
      this.originalModel = null;
    }
    if (this.modifiedModel) {
      this.modifiedModel.dispose();
      this.modifiedModel = null;
    }
  }

  dispose(): void {
    this.disposeModels();
    if (this.diffEditor) {
      this.diffEditor.dispose();
      this.diffEditor = null;
    }
  }

  setTheme(_theme: string): void {
    // Monaco diff editors follow the global theme automatically via monaco.editor.setTheme().
    // This method exists for API compatibility but is a no-op.
  }

  refreshTheme(): void {
    // No-op: diff editor inherits global theme changes automatically.
    // If needed, could call this.diffEditor?.updateOptions({}) to force refresh.
  }

  getEditor(): monaco.editor.IDiffEditor | null {
    return this.diffEditor;
  }
}