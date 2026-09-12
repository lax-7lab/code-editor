import { CommandRegistry, commandRegistry } from "./CommandRegistry";
import { CommandDef } from "../types";

interface CommandPaletteOptions {
  onRun?: (id: string) => void;
}

const CSS_INJECTED_ID = "command-palette-style";

const PALETTE_CSS = `
.cp-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  animation: cp-fade-in 0.15s ease;
}

@keyframes cp-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cp-panel {
  width: 560px;
  max-height: 60vh;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cp-slide-down 0.18s ease;
}

@keyframes cp-slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cp-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--surface-alt);
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 14px;
  outline: none;
}

.cp-input::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.cp-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
}

.cp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s ease;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--text);
}

.cp-item:hover,
.cp-item.active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}

.cp-item-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.cp-item-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cp-category {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  white-space: nowrap;
  flex-shrink: 0;
}

.cp-keys {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.7;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--surface-alt);
  flex-shrink: 0;
}

.cp-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 12px;
  font-style: italic;
  opacity: 0.6;
}
`;

export class CommandPalette {
  private registry: CommandRegistry;
  private onRun?: (id: string) => void;
  private overlay: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private filteredCommands: CommandDef[] = [];
  private selectedIndex = 0;
  private isOpenState = false;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;

  constructor(registry: CommandRegistry = commandRegistry, options: CommandPaletteOptions = {}) {
    this.registry = registry;
    this.onRun = options.onRun;
    this.injectStyles();
  }

  private injectStyles(): void {
    if (document.getElementById(CSS_INJECTED_ID)) return;
    const style = document.createElement("style");
    style.id = CSS_INJECTED_ID;
    style.textContent = PALETTE_CSS;
    document.head.appendChild(style);
  }

  private buildOverlay(): void {
    this.overlay = document.createElement("div");
    this.overlay.className = "cp-overlay";

    const panel = document.createElement("div");
    panel.className = "cp-panel";

    this.input = document.createElement("input");
    this.input.className = "cp-input";
    this.input.type = "text";
    this.input.placeholder = "输入命令…";
    this.input.addEventListener("input", () => this.onInput());
    this.input.addEventListener("keydown", (e) => this.onInputKeydown(e));

    this.list = document.createElement("div");
    this.list.className = "cp-list";

    panel.appendChild(this.input);
    panel.appendChild(this.list);
    this.overlay.appendChild(panel);

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    document.body.appendChild(this.overlay);
  }

  private destroyOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.input = null;
      this.list = null;
    }
  }

  private onInput(): void {
    const query = this.input?.value ?? "";
    this.filteredCommands = this.registry.search(query);
    this.selectedIndex = 0;
    this.renderList();
  }

  private onInputKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.moveSelection(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        this.moveSelection(-1);
        break;
      case "Enter":
        e.preventDefault();
        this.runSelected();
        break;
      case "Escape":
        this.close();
        break;
    }
  }

  private moveSelection(delta: number): void {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.filteredCommands.length) % this.filteredCommands.length;
    this.renderList();
    this.scrollSelectedIntoView();
  }

  private runSelected(): void {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (cmd) {
      this.close();
      if (this.onRun) {
        this.onRun(cmd.id);
      } else {
        this.registry.run(cmd.id);
      }
    }
  }

  private renderList(): void {
    if (!this.list) return;

    this.list.innerHTML = "";

    if (this.filteredCommands.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cp-empty";
      empty.textContent = "未找到命令";
      this.list.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.filteredCommands.length; i++) {
      const cmd = this.filteredCommands[i];
      const item = document.createElement("div");
      item.className = `cp-item${i === this.selectedIndex ? " active" : ""}`;
      item.dataset.index = String(i);

      const content = document.createElement("div");
      content.className = "cp-item-content";

      const title = document.createElement("span");
      title.className = "cp-item-title";
      title.textContent = cmd.title;
      content.appendChild(title);

      if (cmd.category) {
        const category = document.createElement("span");
        category.className = "cp-category";
        category.textContent = cmd.category;
        content.appendChild(category);
      }

      if (cmd.keys) {
        const keys = document.createElement("span");
        keys.className = "cp-keys";
        keys.textContent = cmd.keys;
        content.appendChild(keys);
      }

      item.appendChild(content);

      item.addEventListener("click", () => {
        this.selectedIndex = i;
        this.runSelected();
      });

      item.addEventListener("mouseenter", () => {
        this.selectedIndex = i;
        this.renderList();
      });

      this.list.appendChild(item);
    }
  }

  private scrollSelectedIntoView(): void {
    if (!this.list) return;
    const selected = this.list.querySelector(".cp-item.active");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }

  private setupGlobalListeners(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.isOpenState) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    };
    document.addEventListener("keydown", this.keydownHandler);

    this.clickOutsideHandler = (e: MouseEvent) => {
      if (this.overlay && !this.overlay.contains(e.target as Node)) {
        this.close();
      }
    };
    document.addEventListener("click", this.clickOutsideHandler);
  }

  private removeGlobalListeners(): void {
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.clickOutsideHandler) {
      document.removeEventListener("click", this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
  }

  open(): void {
    if (this.isOpenState) return;
    this.isOpenState = true;
    this.filteredCommands = this.registry.getAll();
    this.selectedIndex = 0;
    this.buildOverlay();
    this.renderList();
    this.setupGlobalListeners();
    // Focus input after a tick to ensure overlay is in DOM
    requestAnimationFrame(() => {
      this.input?.focus();
    });
  }

  close(): void {
    if (!this.isOpenState) return;
    this.isOpenState = false;
    this.removeGlobalListeners();
    this.destroyOverlay();
  }

  toggle(): void {
    if (this.isOpenState) {
      this.close();
    } else {
      this.open();
    }
  }

  isOpen(): boolean {
    return this.isOpenState;
  }

  dispose(): void {
    this.close();
    const style = document.getElementById(CSS_INJECTED_ID);
    if (style) {
      style.remove();
    }
  }
}