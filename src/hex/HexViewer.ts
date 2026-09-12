export function isBinaryContent(data: Uint8Array): boolean {
  if (data.length === 0) return false;

  const checkLength = Math.min(data.length, 1024);
  let nullCount = 0;
  let nonPrintableCount = 0;

  for (let i = 0; i < checkLength; i++) {
    const byte = data[i];
    if (byte === 0x00) {
      nullCount++;
    }
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20) || byte === 0x7f) {
      nonPrintableCount++;
    }
  }

  if (nullCount > 0) return true;
  return nonPrintableCount / checkLength > 0.3;
}

export interface HexViewerOptions {
  onSave?: (data: Uint8Array) => Promise<void> | void;
}

export class HexViewer {
  private container: HTMLElement;
  private data: Uint8Array = new Uint8Array(0);
  private fileName: string = "";
  private selection: number = -1;
  private dirty: boolean = false;
  private visible: boolean = true;
  private styleInjected: boolean = false;
  private onSave?: (data: Uint8Array) => Promise<void> | void;

  private toolbarEl!: HTMLElement;
  private tableWrapEl!: HTMLElement;
  private tableEl!: HTMLTableElement;
  private spacerEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private searchInputEl!: HTMLInputElement;
  private fileNameEl!: HTMLElement;
  private saveBtnEl!: HTMLButtonElement;
  private closeBtnEl!: HTMLButtonElement;
  private findBtnEl!: HTMLButtonElement;

  private readonly ROW_HEIGHT = 20;
  private readonly BYTES_PER_ROW = 16;
  private lastRenderStart = -1;
  private lastRenderEnd = -1;

  constructor(container: HTMLElement, options?: HexViewerOptions) {
    this.container = container;
    this.onSave = options?.onSave;
    this.injectStyles();
    this.buildDOM();
    this.bindEvents();
  }

  private injectStyles(): void {
    if (document.getElementById("hex-viewer-style")) {
      this.styleInjected = true;
      return;
    }

    const style = document.createElement("style");
    style.id = "hex-viewer-style";
    style.textContent = `
      .hx-viewer {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
        color: #d4d4d4;
        font-family: Consolas, "Courier New", monospace;
        font-size: 12px;
      }

      .hx-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        flex-shrink: 0;
      }

      .hx-toolbar label {
        font-size: 12px;
        color: #9cdcfe;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
      }

      .hx-toolbar input {
        padding: 4px 8px;
        background: #3c3c3c;
        border: 1px solid #555;
        color: #d4d4d4;
        font-family: inherit;
        font-size: 12px;
        border-radius: 3px;
        min-width: 200px;
      }

      .hx-toolbar input:focus {
        outline: none;
        border-color: #0e639c;
      }

      .hx-toolbar button {
        padding: 4px 12px;
        background: #0e639c;
        border: none;
        color: #fff;
        font-family: inherit;
        font-size: 12px;
        border-radius: 3px;
        cursor: pointer;
      }

      .hx-toolbar button:hover {
        background: #1177bb;
      }

      .hx-toolbar button:disabled {
        background: #3c3c3c;
        color: #888;
        cursor: not-allowed;
      }

      .hx-table-wrap {
        flex: 1;
        overflow: auto;
        position: relative;
      }

      .hx-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .hx-table thead {
        position: sticky;
        top: 0;
        background: #252526;
        z-index: 1;
      }

      .hx-table th {
        padding: 4px 8px;
        text-align: left;
        font-weight: normal;
        color: #9cdcfe;
        border-bottom: 1px solid #3c3c3c;
        white-space: nowrap;
      }

      .hx-table td {
        padding: 2px 4px;
        vertical-align: top;
        border-bottom: 1px solid #2a2a2a;
      }

      .hx-offset {
        color: #858585;
        user-select: none;
        white-space: nowrap;
        width: 80px;
      }

      .hx-hex {
        font-variant-numeric: tabular-nums;
        min-width: 400px;
      }

      .hx-byte {
        display: inline-block;
        width: 24px;
        text-align: center;
        cursor: pointer;
        padding: 0 2px;
        border-radius: 2px;
        transition: background 0.1s;
      }

      .hx-byte:hover {
        background: #3c3c3c;
      }

      .hx-byte.selected {
        background: #0e639c;
        color: #fff;
      }

      .hx-ascii {
        color: #ce9178;
        white-space: pre;
        font-family: inherit;
        width: 160px;
      }

      .hx-spacer {
        pointer-events: none;
      }

      .hx-status {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 4px 10px;
        background: #007acc;
        color: #fff;
        font-size: 11px;
        border-top: 1px solid #3c3c3c;
        flex-shrink: 0;
      }

      .hx-status .dirty-yes {
        color: #f14c4c;
      }

      .hx-status .dirty-no {
        color: #4ec9b0;
      }
    `;
    document.head.appendChild(style);
    this.styleInjected = true;
  }

  private buildDOM(): void {
    this.container.className = "hx-viewer";
    this.container.innerHTML = "";

    // Toolbar
    this.toolbarEl = document.createElement("div");
    this.toolbarEl.className = "hx-toolbar";
    this.toolbarEl.innerHTML = `
      <label class="hx-filename"></label>
      <input type="text" class="hx-search" placeholder="查找十六进制字节（如 48 65 6C）" />
      <button class="hx-find" disabled>查找</button>
      <button class="hx-save" disabled>保存</button>
      <button class="hx-close">关闭</button>
    `;
    this.container.appendChild(this.toolbarEl);

    this.fileNameEl = this.toolbarEl.querySelector(".hx-filename")!;
    this.searchInputEl = this.toolbarEl.querySelector(".hx-search")!;
    this.findBtnEl = this.toolbarEl.querySelector(".hx-find")!;
    this.saveBtnEl = this.toolbarEl.querySelector(".hx-save")!;
    this.closeBtnEl = this.toolbarEl.querySelector(".hx-close")!;

    // Table wrapper
    this.tableWrapEl = document.createElement("div");
    this.tableWrapEl.className = "hx-table-wrap";
    this.container.appendChild(this.tableWrapEl);

    this.tableEl = document.createElement("table");
    this.tableEl.className = "hx-table";
    this.tableEl.innerHTML = `
      <thead>
        <tr>
          <th class="hx-offset">偏移</th>
          <th class="hx-hex">十六进制</th>
          <th class="hx-ascii">ASCII</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    this.tableWrapEl.appendChild(this.tableEl);

    this.spacerEl = document.createElement("div");
    this.spacerEl.className = "hx-spacer";
    this.tableWrapEl.appendChild(this.spacerEl);

    // Status bar
    this.statusEl = document.createElement("div");
    this.statusEl.className = "hx-status";
    this.statusEl.innerHTML = `
      <span class="hx-status-offset">偏移：0x00000000</span>
      <span class="hx-status-byte">字节：00</span>
      <span class="hx-status-ascii">ASCII: .</span>
      <span class="hx-status-size">大小：0 字节</span>
      <span class="hx-status-dirty dirty-no">已修改：否</span>
    `;
    this.container.appendChild(this.statusEl);
  }

  private bindEvents(): void {
    // Scroll for virtualized rendering
    this.tableWrapEl.addEventListener("scroll", () => this.renderVisibleRows());

    // Search input
    this.searchInputEl.addEventListener("input", () => {
      this.findBtnEl.disabled = this.searchInputEl.value.trim() === "";
    });
    this.searchInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleFind();
    });
    this.findBtnEl.addEventListener("click", () => this.handleFind());

    // Save button
    this.saveBtnEl.addEventListener("click", () => this.handleSave());

    // Close button
    this.closeBtnEl.addEventListener("click", () => this.hide());

    // Table click for selection
    this.tableEl.addEventListener("click", (e) => {
      const byteEl = (e.target as HTMLElement).closest(".hx-byte") as HTMLElement | null;
      if (byteEl) {
        const index = parseInt(byteEl.dataset.index || "-1", 10);
        if (!isNaN(index)) this.setSelection(index);
      }
    });

    // Keyboard navigation and editing
    this.container.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // Focus management
    this.container.addEventListener("focusin", () => {
      this.container.classList.add("hx-focused");
    });
    this.container.addEventListener("focusout", () => {
      this.container.classList.remove("hx-focused");
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.selection < 0 || this.selection >= this.data.length) return;

    const isInputFocused = document.activeElement === this.searchInputEl;
    if (isInputFocused) return;

    let newSelection = this.selection;
    let handled = false;

    switch (e.key) {
      case "ArrowRight":
        newSelection = Math.min(this.selection + 1, this.data.length - 1);
        handled = true;
        break;
      case "ArrowLeft":
        newSelection = Math.max(this.selection - 1, 0);
        handled = true;
        break;
      case "ArrowDown":
        newSelection = Math.min(this.selection + this.BYTES_PER_ROW, this.data.length - 1);
        handled = true;
        break;
      case "ArrowUp":
        newSelection = Math.max(this.selection - this.BYTES_PER_ROW, 0);
        handled = true;
        break;
      case "Home":
        newSelection = Math.floor(this.selection / this.BYTES_PER_ROW) * this.BYTES_PER_ROW;
        handled = true;
        break;
      case "End":
        newSelection = Math.min(
          Math.floor(this.selection / this.BYTES_PER_ROW) * this.BYTES_PER_ROW + this.BYTES_PER_ROW - 1,
          this.data.length - 1
        );
        handled = true;
        break;
      case "PageDown":
        newSelection = Math.min(this.selection + this.BYTES_PER_ROW * 20, this.data.length - 1);
        handled = true;
        break;
      case "PageUp":
        newSelection = Math.max(this.selection - this.BYTES_PER_ROW * 20, 0);
        handled = true;
        break;
      case "Backspace":
      case "Delete":
        this.setByte(this.selection, 0x00);
        newSelection = Math.min(this.selection + 1, this.data.length - 1);
        handled = true;
        break;
      default:
        // Hex digit input
        const hexMatch = e.key.match(/^[0-9a-fA-F]$/);
        if (hexMatch) {
          const digit = parseInt(e.key, 16);
          this.setByte(this.selection, digit);
          newSelection = Math.min(this.selection + 1, this.data.length - 1);
          handled = true;
        }
    }

    if (handled) {
      e.preventDefault();
      this.setSelection(newSelection);
      this.scrollToSelection();
    }
  }

  private setByte(index: number, value: number): void {
    if (index < 0 || index >= this.data.length) return;
    this.data[index] = value & 0xff;
    this.dirty = true;
    this.updateStatusBar();
    this.renderVisibleRows();
  }

  private setSelection(index: number): void {
    if (index < 0 || index >= this.data.length) return;
    this.selection = index;
    this.renderVisibleRows();
    this.updateStatusBar();
  }

  private scrollToSelection(): void {
    if (this.selection < 0) return;
    const row = Math.floor(this.selection / this.BYTES_PER_ROW);
    const rowTop = row * this.ROW_HEIGHT;
    const rowBottom = rowTop + this.ROW_HEIGHT;
    const scrollTop = this.tableWrapEl.scrollTop;
    const clientHeight = this.tableWrapEl.clientHeight;

    if (rowTop < scrollTop) {
      this.tableWrapEl.scrollTop = rowTop;
    } else if (rowBottom > scrollTop + clientHeight) {
      this.tableWrapEl.scrollTop = rowBottom - clientHeight;
    }
  }

  private handleFind(): void {
    const query = this.searchInputEl.value.trim();
    if (!query) return;

    const pattern = this.parseSearchQuery(query);
    if (pattern.length === 0) return;

    const foundIndex = this.findPattern(pattern);
    if (foundIndex >= 0) {
      this.setSelection(foundIndex);
      this.scrollToSelection();
      this.updateStatusBar(`Found at offset 0x${foundIndex.toString(16).padStart(8, "0").toUpperCase()}`);
    } else {
      this.updateStatusBar("Not found");
    }
  }

  private parseSearchQuery(query: string): number[] {
    // Try parsing as space-separated hex bytes
    const hexParts = query.split(/\s+/).filter((p) => p.length > 0);
    const hexBytes: number[] = [];

    let allHex = true;
    for (const part of hexParts) {
      if (!/^[0-9a-fA-F]{1,2}$/.test(part)) {
        allHex = false;
        break;
      }
      hexBytes.push(parseInt(part, 16));
    }

    if (allHex && hexBytes.length > 0) {
      return hexBytes;
    }

    // Fallback: treat as ASCII string
    return Array.from(query, (c) => c.charCodeAt(0));
  }

  private findPattern(pattern: number[]): number {
    if (pattern.length === 0 || pattern.length > this.data.length) return -1;

    for (let i = 0; i <= this.data.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (this.data[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }

  private async handleSave(): Promise<void> {
    if (this.onSave) {
      try {
        await this.onSave(this.data);
        this.dirty = false;
        this.updateStatusBar();
        this.saveBtnEl.disabled = true;
      } catch (err) {
        this.updateStatusBar(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }
    // No external handler: just clear the dirty flag
    this.dirty = false;
    this.updateStatusBar();
    this.saveBtnEl.disabled = true;
  }

  private renderVisibleRows(): void {
    const scrollTop = this.tableWrapEl.scrollTop;
    const clientHeight = this.tableWrapEl.clientHeight;
    const totalRows = Math.ceil(this.data.length / this.BYTES_PER_ROW);

    const startRow = Math.max(0, Math.floor(scrollTop / this.ROW_HEIGHT) - 2);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + clientHeight) / this.ROW_HEIGHT) + 2);

    if (startRow === this.lastRenderStart && endRow === this.lastRenderEnd) return;

    this.lastRenderStart = startRow;
    this.lastRenderEnd = endRow;

    const tbody = this.tableEl.querySelector("tbody")!;
    tbody.innerHTML = "";

    for (let row = startRow; row < endRow; row++) {
      const tr = document.createElement("tr");
      const offset = row * this.BYTES_PER_ROW;

      // Offset cell
      const offsetTd = document.createElement("td");
      offsetTd.className = "hx-offset";
      offsetTd.textContent = `0x${offset.toString(16).padStart(8, "0").toUpperCase()}`;
      tr.appendChild(offsetTd);

      // Hex cell
      const hexTd = document.createElement("td");
      hexTd.className = "hx-hex";
      for (let col = 0; col < this.BYTES_PER_ROW; col++) {
        const index = offset + col;
        const span = document.createElement("span");
        span.className = "hx-byte";
        span.dataset.index = index.toString();
        if (index < this.data.length) {
          span.textContent = this.data[index].toString(16).padStart(2, "0").toUpperCase();
          if (index === this.selection) {
            span.classList.add("selected");
          }
        } else {
          span.textContent = "  ";
          span.style.visibility = "hidden";
        }
        hexTd.appendChild(span);
      }
      tr.appendChild(hexTd);

      // ASCII cell
      const asciiTd = document.createElement("td");
      asciiTd.className = "hx-ascii";
      let asciiStr = "";
      for (let col = 0; col < this.BYTES_PER_ROW; col++) {
        const index = offset + col;
        if (index < this.data.length) {
          const byte = this.data[index];
          asciiStr += byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ".";
        } else {
          asciiStr += " ";
        }
      }
      asciiTd.textContent = asciiStr;
      tr.appendChild(asciiTd);

      tbody.appendChild(tr);
    }

    // Update spacer height
    this.spacerEl.style.height = `${totalRows * this.ROW_HEIGHT}px`;
  }

  private updateStatusBar(message?: string): void {
    const offsetEl = this.statusEl.querySelector(".hx-status-offset")!;
    const byteEl = this.statusEl.querySelector(".hx-status-byte")!;
    const asciiEl = this.statusEl.querySelector(".hx-status-ascii")!;
    const sizeEl = this.statusEl.querySelector(".hx-status-size")!;
    const dirtyEl = this.statusEl.querySelector(".hx-status-dirty")!;

    if (this.selection >= 0 && this.selection < this.data.length) {
      const byte = this.data[this.selection];
      offsetEl.textContent = `偏移：0x${this.selection.toString(16).padStart(8, "0").toUpperCase()}`;
      byteEl.textContent = `字节：${byte.toString(16).padStart(2, "0").toUpperCase()}`;
      asciiEl.textContent = `ASCII: ${byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : "."}`;
    } else {
      offsetEl.textContent = "偏移：0x00000000";
      byteEl.textContent = "字节：00";
      asciiEl.textContent = "ASCII: .";
    }

    sizeEl.textContent = `大小：${this.data.length} 字节`;

    if (this.dirty) {
      dirtyEl.textContent = "已修改：是";
      dirtyEl.className = "hx-status-dirty dirty-yes";
      this.saveBtnEl.disabled = false;
    } else {
      dirtyEl.textContent = "已修改：否";
      dirtyEl.className = "hx-status-dirty dirty-no";
      this.saveBtnEl.disabled = true;
    }

    if (message) {
      // Temporary message - could add a timeout to clear
      console.log(message);
    }
  }

  load(data: Uint8Array, fileName: string): void {
    this.data = new Uint8Array(data);
    this.fileName = fileName;
    this.selection = this.data.length > 0 ? 0 : -1;
    this.dirty = false;
    this.fileNameEl.textContent = fileName;
    this.searchInputEl.value = "";
    this.findBtnEl.disabled = true;
    this.saveBtnEl.disabled = true;
    this.lastRenderStart = -1;
    this.lastRenderEnd = -1;
    this.renderVisibleRows();
    this.updateStatusBar();
  }

  getData(): Uint8Array {
    return this.data;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  show(): void {
    this.visible = true;
    this.container.style.display = "flex";
    this.renderVisibleRows();
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = "none";
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

  dispose(): void {
    this.container.innerHTML = "";
    // Note: We don't remove the injected style as other instances may need it
  }
}