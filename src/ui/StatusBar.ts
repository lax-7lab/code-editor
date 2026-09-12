import type { EditorPaneState } from "../types";

export class StatusBar {
  private container: HTMLElement;
  private lineEl: HTMLElement;
  private colEl: HTMLElement;
  private langEl: HTMLElement;
  private encodingEl: HTMLElement;
  private eolEl: HTMLElement;
  private dirtyEl: HTMLElement;
  private sizeEl: HTMLElement;
  private spacesEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    container.classList.add("statusbar");
    container.innerHTML = `
      <div class="status-left">
        <span id="sb-line" class="status-item">Ln 1</span>
        <span id="sb-col" class="status-item">Col 1</span>
        <span id="sb-dirty" class="status-item dirty hidden"></span>
      </div>
      <div class="status-right">
        <span id="sb-spaces" class="status-item">Spaces: 4</span>
        <span id="sb-size" class="status-item"></span>
        <span id="sb-encoding" class="status-item">UTF-8</span>
        <span id="sb-eol" class="status-item">LF</span>
        <span id="sb-lang" class="status-item accent">Plain Text</span>
      </div>
    `;
    this.lineEl = container.querySelector("#sb-line")!;
    this.colEl = container.querySelector("#sb-col")!;
    this.dirtyEl = container.querySelector("#sb-dirty")!;
    this.sizeEl = container.querySelector("#sb-size")!;
    this.encodingEl = container.querySelector("#sb-encoding")!;
    this.eolEl = container.querySelector("#sb-eol")!;
    this.langEl = container.querySelector("#sb-lang")!;
    this.spacesEl = container.querySelector("#sb-spaces")!;
  }

  updateCursor(line: number, col: number): void {
    this.lineEl.textContent = `Ln ${line}`;
    this.colEl.textContent = `Col ${col}`;
  }

  updateState(state: EditorPaneState): void {
    this.langEl.textContent = state.language.charAt(0).toUpperCase() + state.language.slice(1);
    this.encodingEl.textContent = state.encoding;
    this.eolEl.textContent = state.lineEndings;
    this.sizeEl.textContent = `${new Blob([state.content]).size} 字节`;
    if (state.isDirty) {
      this.dirtyEl.textContent = "● 未保存";
      this.dirtyEl.classList.remove("hidden");
    } else {
      this.dirtyEl.classList.add("hidden");
    }
  }

  setSpaces(n: number): void {
    this.spacesEl.textContent = `空格：${n}`;
  }
}