import { EditorCore } from "./EditorCore";

export class SplitView {
  private container: HTMLElement;
  private editorCore: EditorCore;
  private panes: Map<number, { id: number; element: HTMLElement }> = new Map();
  private orientation: "horizontal" | "vertical" = "horizontal";
  private onPaneAdded?: (paneId: number) => void;
  private onPaneRemoved?: (paneId: number) => void;

  constructor(
    container: HTMLElement,
    editorCore: EditorCore,
    options?: { onPaneAdded?: (paneId: number) => void; onPaneRemoved?: (paneId: number) => void }
  ) {
    this.container = container;
    this.editorCore = editorCore;
    this.onPaneAdded = options?.onPaneAdded;
    this.onPaneRemoved = options?.onPaneRemoved;
    container.classList.add("split-container");
  }

  addPane(): number {
    const element = document.createElement("div");
    element.className = "split-pane";
    this.container.appendChild(element);

    const editorContainer = document.createElement("div");
    editorContainer.className = "monaco-holder";
    element.appendChild(editorContainer);

    const id = this.editorCore.createPane(editorContainer);
    this.panes.set(id, { id, element });
    this.onPaneAdded?.(id);
    return id;
  }

  removePane(id: number): void {
    const pane = this.panes.get(id);
    if (pane) {
      pane.element.remove();
      this.panes.delete(id);
      this.editorCore.disposePane(id);
      this.onPaneRemoved?.(id);
    }
  }

  setOrientation(orientation: "horizontal" | "vertical"): void {
    this.orientation = orientation;
    this.container.classList.toggle("vertical", orientation === "vertical");
    this.editorCore.layoutAll();
  }

  getOrientation(): "horizontal" | "vertical" {
    return this.orientation;
  }

  getPaneCount(): number {
    return this.panes.size;
  }

  getPaneIds(): number[] {
    return Array.from(this.panes.keys());
  }

  layout(): void {
    this.editorCore.layoutAll();
  }
}