import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Command, Child } from "@tauri-apps/plugin-shell";
import "xterm/css/xterm.css";

export class TerminalPanel {
  private container: HTMLElement;
  private term: Terminal;
  private fitAddon: FitAddon;
  private child: Child | null = null;
  private visible = false;
  private styleEl: HTMLStyleElement;
  private resizeObserver: ResizeObserver | null = null;
  private panelEl: HTMLElement | null = null;
  private hostEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.term = new Terminal({
      cursorBlink: true,
      fontFamily: "Consolas, 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
        black: "#1e1e1e",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#dcdcaa",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
        brightBlack: "#858585",
        brightRed: "#f44747",
        brightGreen: "#6a9955",
        brightYellow: "#dcdcaa",
        brightBlue: "#569cd6",
        brightMagenta: "#c586c0",
        brightCyan: "#4ec9b0",
        brightWhite: "#ffffff",
      },
    });
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);

    this.styleEl = document.createElement("style");
    this.styleEl.id = "terminal-panel-style";
    this.styleEl.textContent = this.getStyles();
    document.head.appendChild(this.styleEl);

    this.buildDOM();
    this.setupResizeObserver();
  }

  private getStyles(): string {
    return `
      .tm-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #1e1e1e;
        color: #d4d4d4;
        font-family: Consolas, 'Courier New', monospace;
        font-size: 13px;
        border-top: 1px solid #3c3c3c;
      }
      .tm-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 28px;
        padding: 0 8px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        user-select: none;
        flex-shrink: 0;
      }
      .tm-title {
        font-size: 12px;
        font-weight: 500;
        color: #cccccc;
      }
      .tm-actions {
        display: flex;
        gap: 4px;
      }
      .tm-btn {
        background: transparent;
        border: 1px solid #3c3c3c;
        color: #cccccc;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        border-radius: 3px;
        transition: background 0.1s, border-color 0.1s;
      }
      .tm-btn:hover {
        background: #3c3c3c;
        border-color: #555;
      }
      .tm-btn:active {
        background: #4a4a4a;
      }
      .tm-host {
        flex: 1 1 auto;
        height: 100%;
        width: 100%;
        flex-shrink: 0;
        min-height: 0;
        overflow: hidden;
      }
      .tm-hidden {
        display: none !important;
      }
    `;
  }

  private buildDOM(): void {
    this.panelEl = document.createElement("div");
    this.panelEl.className = "tm-panel tm-hidden";

    const bar = document.createElement("div");
    bar.className = "tm-bar";

    const title = document.createElement("span");
    title.className = "tm-title";
    title.textContent = "终端";

    const actions = document.createElement("div");
    actions.className = "tm-actions";

    const newSessionBtn = document.createElement("button");
    newSessionBtn.className = "tm-btn";
    newSessionBtn.textContent = "新建会话";
    newSessionBtn.addEventListener("click", () => this.newSession());

    const closeBtn = document.createElement("button");
    closeBtn.className = "tm-btn";
    closeBtn.textContent = "关闭";
    closeBtn.addEventListener("click", () => this.hide());

    actions.appendChild(newSessionBtn);
    actions.appendChild(closeBtn);
    bar.appendChild(title);
    bar.appendChild(actions);

    this.hostEl = document.createElement("div");
    this.hostEl.className = "tm-host";

    this.panelEl.appendChild(bar);
    this.panelEl.appendChild(this.hostEl);
    this.container.appendChild(this.panelEl);
  }

  private setupResizeObserver(): void {
    if (!this.panelEl) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.visible) {
        this.fitAddon.fit();
      }
    });
    this.resizeObserver.observe(this.panelEl);
  }

  private async spawn(): Promise<void> {
    try {
      const cmd = Command.create("cmd", ["/K"]);
      this.child = await cmd.spawn();

      cmd.stdout.on("data", (data: string) => {
        this.term.write(data);
      });

      cmd.stderr.on("data", (data: string) => {
        this.term.write(data);
      });

      this.term.onData((data: string) => {
        this.child?.write(data).catch((err: unknown) => {
          console.error("[Terminal] Write failed:", err);
        });
      });

      cmd.on("close", () => {
        this.term.write("\r\n[Process exited]\r\n");
        this.child = null;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.term.write(`\r\n[Error spawning shell: ${msg}]\r\n`);
      this.child = null;
    }
  }

  private async show(): Promise<void> {
    if (!this.panelEl) return;
    this.panelEl.classList.remove("tm-hidden");
    this.visible = true;

    if (!this.child) {
      this.term.open(this.hostEl!);
      this.fitAddon.fit();
      await this.spawn();
    } else {
      this.fitAddon.fit();
    }
  }

  private hide(): void {
    if (!this.panelEl) return;
    this.panelEl.classList.add("tm-hidden");
    this.visible = false;
  }

  toggle(): boolean {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  resize(): void {
    this.fitAddon.fit();
  }

  private async newSession(): Promise<void> {
    if (this.child) {
      try {
        await this.child.kill();
      } catch {
        // ignore
      }
      this.child = null;
    }
    this.term.reset();
    await this.spawn();
  }

  dispose(): void {
    if (this.child) {
      try {
        this.child.kill();
      } catch {
        // ignore
      }
      this.child = null;
    }
    this.term.dispose();
    if (this.resizeObserver && this.panelEl) {
      this.resizeObserver.unobserve(this.panelEl);
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.styleEl && this.styleEl.parentNode) {
      this.styleEl.parentNode.removeChild(this.styleEl);
    }
    if (this.panelEl && this.panelEl.parentNode) {
      this.panelEl.parentNode.removeChild(this.panelEl);
    }
    this.panelEl = null;
    this.hostEl = null;
  }
}