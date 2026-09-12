interface PanelCallbacks {
  onSelect: (panel: string) => void;
}

const PANEL_TABS: Array<{ id: string; label: string }> = [
  { id: "tasks", label: "任务" },
  { id: "search", label: "搜索" },
  { id: "output", label: "输出" },
];

export class Panels {
  private container: HTMLElement;
  private host: HTMLElement;
  private header: HTMLElement;
  private resizer: HTMLElement;
  private callbacks: PanelCallbacks;
  private openState: boolean = false;
  private activePanel: string = "";
  private panelHeight: number = 180;
  private onResize?: (height: number) => void;
  private tabButtons: Map<string, HTMLButtonElement> = new Map();

  constructor(container: HTMLElement, callbacks: PanelCallbacks, onResize?: (height: number) => void) {
    this.container = container;
    this.host = container.querySelector("#panel-host") as HTMLElement;
    this.callbacks = callbacks;
    this.onResize = onResize;
    this.panelHeight = 180;

    container.classList.add("bottom-panel");
    container.style.display = "none";

    this.header = document.createElement("div");
    this.header.className = "panel-header";

    for (const tab of PANEL_TABS) {
      const btn = document.createElement("button");
      btn.className = "panel-tab-btn";
      btn.setAttribute("data-panel", tab.id);
      btn.textContent = tab.label;
      btn.addEventListener("click", () => this.open(tab.id));
      this.header.appendChild(btn);
      this.tabButtons.set(tab.id, btn);
    }

    const collapseBtn = document.createElement("button");
    collapseBtn.className = "panel-collapse-btn";
    collapseBtn.innerHTML = `<svg viewBox="0 0 12 12" width="12" height="12"><path d="M2 8l4-4 4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    collapseBtn.addEventListener("click", () => this.close());
    this.header.appendChild(collapseBtn);

    this.container.insertBefore(this.header, this.host);

    this.resizer = document.createElement("div");
    this.resizer.className = "panel-resizer";
    this.container.insertBefore(this.resizer, this.header);

    this.initResizer();
  }

  private initResizer(): void {
    let startY = 0;
    let startHeight = 0;

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      const maxH = window.innerHeight * 0.6;
      const newHeight = Math.min(Math.max(startHeight + delta, 100), maxH);
      this.panelHeight = newHeight;
      this.container.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      document.body.classList.remove("resizing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this.onResize?.(this.panelHeight);
    };

    this.resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = this.panelHeight;
      document.body.classList.add("resizing");
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  private updateTabHighlight(): void {
    for (const [id, btn] of this.tabButtons) {
      btn.classList.toggle("active", id === this.activePanel);
    }
  }

  open(panel: string): void {
    this.openState = true;
    this.activePanel = panel;
    this.container.style.display = "";
    this.container.style.height = `${this.panelHeight}px`;
    this.updateTabHighlight();
    this.callbacks.onSelect(panel);
  }

  addTab(id: string, label: string): void {
    const btn = document.createElement("button");
    btn.className = "panel-tab-btn";
    btn.setAttribute("data-panel", id);
    btn.textContent = label;
    btn.addEventListener("click", () => this.open(id));
    const collapseBtn = this.header.querySelector(".panel-collapse-btn");
    if (collapseBtn) {
      this.header.insertBefore(btn, collapseBtn);
    } else {
      this.header.appendChild(btn);
    }
    this.tabButtons.set(id, btn);
  }

  close(): void {
    this.openState = false;
    this.container.style.display = "none";
  }

  toggle(panel: string): void {
    if (this.openState && this.activePanel === panel) {
      this.close();
    } else {
      this.open(panel);
    }
  }

  isOpen(): boolean {
    return this.openState;
  }
}
