export class Sidebar {
  private container: HTMLElement;
  private host: HTMLElement;
  private resizer: HTMLElement;
  private visible: boolean = true;
  private width: number = 260;
  private onResize?: (width: number) => void;

  constructor(container: HTMLElement, onResize?: (width: number) => void) {
    this.container = container;
    this.host = container.querySelector("#sidebar-host") as HTMLElement;
    this.onResize = onResize;

    container.classList.add("sidebar");
    container.style.width = `${this.width}px`;

    this.resizer = document.createElement("div");
    this.resizer.className = "sidebar-resizer";
    container.appendChild(this.resizer);

    this.initResizer();
  }

  private initResizer(): void {
    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + delta, 180), 480);
      this.width = newWidth;
      this.container.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.body.classList.remove("resizing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this.onResize?.(this.width);
    };

    this.resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = this.width;
      document.body.classList.add("resizing");
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  show(): void {
    this.visible = true;
    this.container.style.display = "";
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = "none";
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  setWidth(px: number): void {
    this.width = Math.min(Math.max(px, 180), 480);
    this.container.style.width = `${this.width}px`;
  }
}
