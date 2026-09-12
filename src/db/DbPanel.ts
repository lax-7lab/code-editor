export interface DbConnectionConfig {
  type: "sqlite" | "mysql";
  name: string;
  path?: string;
  url?: string;
}

interface QueryResult {
  rowsAffected: number;
  lastInsertId?: number;
}

interface DatabaseInstance {
  select<T>(sql: string, bindValues?: unknown[]): Promise<T>;
  execute(sql: string, bindValues?: unknown[]): Promise<QueryResult>;
  close(db?: string): Promise<boolean>;
}

export class DbPanel {
  private container: HTMLElement;
  private db: DatabaseInstance | null = null;
  private config: DbConnectionConfig | null = null;
  private styleInjected = false;

  // UI Elements
  private connTypeSelect!: HTMLSelectElement;
  private connInput!: HTMLInputElement;
  private browseBtn!: HTMLButtonElement;
  private connectBtn!: HTMLButtonElement;
  private disconnectBtn!: HTMLButtonElement;
  private tableListDiv!: HTMLDivElement;
  private queryTextarea!: HTMLTextAreaElement;
  private runBtn!: HTMLButtonElement;
  private resultsDiv!: HTMLDivElement;
  private statusDiv!: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.injectStyles();
    this.buildUI();
    this.wireEvents();
  }

  private injectStyles(): void {
    if (document.getElementById("db-panel-style")) {
      this.styleInjected = true;
      return;
    }
    const style = document.createElement("style");
    style.id = "db-panel-style";
    style.textContent = `
      .db-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
        color: #d4d4d4;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .db-conn-bar {
        display: flex;
        gap: 8px;
        padding: 8px;
        border-bottom: 1px solid #333;
        flex-wrap: wrap;
      }
      .db-conn-bar input {
        flex: 1;
        background: #252526;
        color: #d4d4d4;
        border: 1px solid #3c3c3c;
        padding: 4px 8px;
        font-family: inherit;
        font-size: 13px;
      }
      .db-conn-bar select {
        background: #252526;
        color: #d4d4d4;
        border: 1px solid #3c3c3c;
        padding: 4px 8px;
        font-family: inherit;
        font-size: 13px;
      }
      .db-conn-bar button {
        background: #0e639c;
        color: white;
        border: none;
        padding: 4px 12px;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
      }
      .db-conn-bar button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .db-body {
        flex: 1;
        display: flex;
        min-height: 0;
        overflow: hidden;
      }
      .db-table-list {
        width: 220px;
        overflow: auto;
        border-right: 1px solid #333;
        padding: 4px;
        flex-shrink: 0;
      }
      .db-table-item {
        padding: 4px 8px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .db-table-item:hover {
        background: #2a2d2e;
      }
      .db-query-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .db-query-input {
        flex: none;
        height: 90px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid #3c3c3c;
        margin: 8px;
        font-family: Consolas, "Courier New", monospace;
        font-size: 13px;
        resize: vertical;
        padding: 8px;
        line-height: 1.5;
      }
      .db-results {
        flex: 1;
        overflow: auto;
        padding: 0 8px 8px;
        min-height: 0;
      }
      .db-results table {
        border-collapse: collapse;
        font-size: 12px;
        width: 100%;
      }
      .db-results th {
        position: sticky;
        top: 0;
        background: #252526;
        padding: 4px 8px;
        border: 1px solid #3c3c3c;
        text-align: left;
        z-index: 1;
      }
      .db-results td {
        padding: 4px 8px;
        border: 1px solid #2d2d2d;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .db-status {
        padding: 4px 8px;
        font-size: 12px;
        color: #9d9d9d;
        border-top: 1px solid #333;
        flex-shrink: 0;
      }
      .db-status.error {
        color: #f48771;
      }
    `;
    document.head.appendChild(style);
    this.styleInjected = true;
  }

  private buildUI(): void {
    this.container.className = "db-panel";
    this.container.innerHTML = "";

    // Connection bar
    const connBar = document.createElement("div");
    connBar.className = "db-conn-bar";

    this.connTypeSelect = document.createElement("select");
    this.connTypeSelect.innerHTML = `
      <option value="sqlite">SQLite</option>
      <option value="mysql">MySQL</option>
    `;

    this.connInput = document.createElement("input");
    this.connInput.type = "text";
    this.connInput.placeholder = "SQLite：文件路径（如 C:\\\\data.db）| MySQL：连接 URL";

    this.browseBtn = document.createElement("button");
    this.browseBtn.textContent = "浏览…";
    this.browseBtn.type = "button";

    this.connectBtn = document.createElement("button");
    this.connectBtn.textContent = "连接";
    this.connectBtn.type = "button";

    this.disconnectBtn = document.createElement("button");
    this.disconnectBtn.textContent = "断开连接";
    this.disconnectBtn.type = "button";
    this.disconnectBtn.disabled = true;

    connBar.append(
      this.connTypeSelect,
      this.connInput,
      this.browseBtn,
      this.connectBtn,
      this.disconnectBtn
    );

    // Body
    const body = document.createElement("div");
    body.className = "db-body";

    // Table list (left)
    this.tableListDiv = document.createElement("div");
    this.tableListDiv.className = "db-table-list";
    this.tableListDiv.setAttribute("role", "list");
    this.tableListDiv.setAttribute("aria-label", "Database tables");

    // Query area (right)
    const queryArea = document.createElement("div");
    queryArea.className = "db-query-area";

    this.queryTextarea = document.createElement("textarea");
    this.queryTextarea.className = "db-query-input";
    this.queryTextarea.placeholder = "SELECT * FROM table LIMIT 100";
    this.queryTextarea.spellcheck = false;

    this.runBtn = document.createElement("button");
    this.runBtn.textContent = "Run";
    this.runBtn.type = "button";
    this.runBtn.style.cssText = "margin: 0 8px 8px; align-self: flex-end; background: #0e639c; color: white; border: none; padding: 4px 16px; cursor: pointer;";

    this.resultsDiv = document.createElement("div");
    this.resultsDiv.className = "db-results";

    queryArea.append(this.queryTextarea, this.runBtn, this.resultsDiv);
    body.append(this.tableListDiv, queryArea);

    // Status bar
    this.statusDiv = document.createElement("div");
    this.statusDiv.className = "db-status";
    this.statusDiv.textContent = "未连接";

    this.container.append(connBar, body, this.statusDiv);
  }

  private wireEvents(): void {
    this.connTypeSelect.addEventListener("change", () => {
      this.updateBrowseButtonVisibility();
    });

    this.browseBtn.addEventListener("click", async () => {
      await this.handleBrowse();
    });

    this.connectBtn.addEventListener("click", async () => {
      await this.handleConnect();
    });

    this.disconnectBtn.addEventListener("click", async () => {
      await this.disconnect();
    });

    this.runBtn.addEventListener("click", async () => {
      await this.runQuery(this.queryTextarea.value);
    });

    this.queryTextarea.addEventListener("keydown", async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        await this.runQuery(this.queryTextarea.value);
      }
    });
  }

  private updateBrowseButtonVisibility(): void {
    this.browseBtn.style.display = this.connTypeSelect.value === "sqlite" ? "inline-block" : "none";
  }

  private async handleBrowse(): Promise<void> {
    if (this.connTypeSelect.value !== "sqlite") return;

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        multiple: false,
        filters: [{ name: "SQLite 数据库", extensions: ["db", "sqlite", "sqlite3"] }]
      });
      if (path) {
        this.connInput.value = path;
      }
    } catch (err) {
      this.setStatus(`浏览失败：${err instanceof Error ? err.message : String(err)}`, true);
    }
  }

  private async handleConnect(): Promise<void> {
    const type = this.connTypeSelect.value as "sqlite" | "mysql";
    const inputValue = this.connInput.value.trim();

    if (!inputValue) {
      this.setStatus("请输入路径或 URL", true);
      return;
    }

    const config: DbConnectionConfig = {
      type,
      name: inputValue,
      path: type === "sqlite" ? inputValue : undefined,
      url: type === "mysql" ? inputValue : undefined
    };

    await this.connect(config);
  }

  async connect(config: DbConnectionConfig): Promise<void> {
    try {
      this.setStatus("正在连接…");

      const Database = (await import("@tauri-apps/plugin-sql")).default;

      let url: string;
      if (config.type === "sqlite") {
        if (!config.path) throw new Error("SQLite path is required");
        url = `sqlite:${config.path}`;
      } else {
        if (!config.url) throw new Error("MySQL URL is required");
        url = config.url;
      }

      this.db = await Database.load(url) as DatabaseInstance;
      this.config = config;

      // Load tables
      let tablesSql: string;
      if (config.type === "sqlite") {
        tablesSql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
      } else {
        tablesSql = "SHOW TABLES";
      }

      const rows = await this.db.select<Record<string, unknown>[]>(tablesSql);
      const tableNames = rows.map(r => {
        // Handle different column names from different DBs
        const keys = Object.keys(r);
        return String(r[keys[0]]);
      });

      this.renderTables(tableNames);
      this.setConnectionUI(true);
      this.setStatus(`Connected: ${config.name}`);
    } catch (err) {
      this.setStatus(`Connection failed: ${err instanceof Error ? err.message : String(err)}`, true);
      this.db = null;
      this.config = null;
    }
  }

  private setConnectionUI(connected: boolean): void {
    this.connectBtn.disabled = connected;
    this.disconnectBtn.disabled = !connected;
    this.connTypeSelect.disabled = connected;
    this.connInput.disabled = connected;
    this.browseBtn.disabled = connected;
  }

  async runQuery(sql: string): Promise<void> {
    if (!this.db) {
      this.setStatus("未连接", true);
      return;
    }

    const trimmed = sql.trim();
    if (!trimmed) {
      this.setStatus("查询内容为空", true);
      return;
    }

    try {
      this.setStatus("正在运行…");

      const isSelect = /^\s*(select|show|describe|explain|pragma|pr)\b/i.test(trimmed);

      if (isSelect) {
        const rows = await this.db.select<Record<string, unknown>[]>(trimmed);
        this.renderResults(rows);
        this.setStatus(`${rows.length} row(s)`);
      } else {
        const result = await this.db.execute(trimmed);
        this.renderResults([]);
        this.setStatus(`OK — rowsAffected: ${result.rowsAffected}, lastInsertId: ${result.lastInsertId ?? "N/A"}`);
      }
    } catch (err) {
      this.setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`, true);
      this.renderResults([]);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
      }
    } catch (err) {
      this.setStatus(`断开连接错误：${err instanceof Error ? err.message : String(err)}`, true);
    } finally {
      this.db = null;
      this.config = null;
      this.renderTables([]);
      this.renderResults([]);
      this.setConnectionUI(false);
      this.setStatus("未连接");
    }
  }

  dispose(): void {
    this.container.innerHTML = "";
    if (this.styleInjected) {
      const style = document.getElementById("db-panel-style");
      if (style) style.remove();
      this.styleInjected = false;
    }
  }

  private renderTables(names: string[]): void {
    this.tableListDiv.innerHTML = "";
    for (const name of names) {
      const item = document.createElement("div");
      item.className = "db-table-item";
      item.textContent = name;
      item.setAttribute("role", "listitem");
      item.setAttribute("tabindex", "0");
      item.addEventListener("click", () => this.onTableClick(name));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.onTableClick(name);
        }
      });
      this.tableListDiv.appendChild(item);
    }
  }

  private onTableClick(name: string): void {
    const quoted = name.includes(" ") || name.includes("-") || name.includes(".") ? `\`${name}\`` : name;
    this.queryTextarea.value = `SELECT * FROM ${quoted} LIMIT 100`;
    this.runQuery(this.queryTextarea.value);
  }

  private renderResults(rows: Record<string, unknown>[]): void {
    this.resultsDiv.innerHTML = "";

    if (rows.length === 0) {
      return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const headers = Object.keys(rows[0]);
    const headerRow = document.createElement("tr");
    for (const h of headers) {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);

    for (const row of rows) {
      const tr = document.createElement("tr");
      for (const h of headers) {
        const td = document.createElement("td");
        const val = row[h];
        td.textContent = val === null || val === undefined ? "NULL" : String(val);
        td.title = td.textContent || "";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.append(thead, tbody);
    this.resultsDiv.appendChild(table);
  }

  private setStatus(text: string, isError = false): void {
    this.statusDiv.textContent = text;
    this.statusDiv.classList.toggle("error", isError);
  }
}