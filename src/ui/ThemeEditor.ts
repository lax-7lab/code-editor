import { ThemeManager, CustomThemeColors } from "./ThemeManager";

const DEFAULT_COLORS: CustomThemeColors = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  accent: "#0e639c",
  selection: "#264f78",
  keyword: "#569cd6",
  string: "#ce9178",
  comment: "#6a9955",
  number: "#b5cea8",
  function: "#dcdcaa",
  type: "#4ec9b0",
};

const STYLE_ID = "theme-editor-style";

const STYLE_CSS = `
.te-panel {
  padding: 12px;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color: #d4d4d4;
  line-height: 1.4;
}
.te-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #e0e0e0;
}
.te-hint {
  font-size: 11px;
  color: #9d9d9d;
  margin-bottom: 12px;
}
.te-section {
  margin-bottom: 12px;
}
.te-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9d9d9d;
  margin-bottom: 6px;
}
.te-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.te-label {
  flex: 1;
  font-size: 12px;
  color: #b0b0b0;
}
.te-color {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  border-radius: 3px;
  overflow: hidden;
}
.te-color::-webkit-color-swatch-wrapper {
  padding: 0;
}
.te-color::-webkit-color-swatch {
  border: 1px solid #3c3c3c;
  border-radius: 3px;
}
.te-hex {
  width: 64px;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 11px;
  color: #9d9d9d;
  background: transparent;
  border: 1px solid #3c3c3c;
  padding: 2px 4px;
  border-radius: 3px;
  text-align: center;
}
.te-hex:focus {
  outline: none;
  border-color: #0e639c;
  color: #d4d4d4;
}
.te-preview {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 10px;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 12px;
  overflow-x: auto;
  white-space: pre;
}
.te-buttons {
  display: flex;
  gap: 8px;
}
.te-btn {
  background: #0e639c;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.15s;
}
.te-btn:hover {
  background: #1177bb;
}
.te-btn.secondary {
  background: #3c3c3c;
}
.te-btn.secondary:hover {
  background: #505050;
}
`;

export class ThemeEditor {
  private container: HTMLElement;
  private themeManager: ThemeManager;
  private onApply: (colors: CustomThemeColors) => void;
  private previewEl: HTMLDivElement | null = null;
  private inputs: Record<keyof CustomThemeColors, HTMLInputElement> = {} as any;
  private hexInputs: Record<keyof CustomThemeColors, HTMLInputElement> = {} as any;

  constructor(
    container: HTMLElement,
    themeManager: ThemeManager,
    onApply: (colors: CustomThemeColors) => void
  ) {
    this.container = container;
    this.themeManager = themeManager;
    this.onApply = onApply;
    this.injectStyles();
    this.build();
    const existing = themeManager.getCustomThemeColors();
    if (existing) {
      this.setColors(existing);
    }
  }

  private injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_CSS;
    document.head.appendChild(style);
  }

  private build(): void {
    this.container.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "te-panel";

    // Header
    const title = document.createElement("div");
    title.className = "te-title";
    title.textContent = "主题编辑器";
    panel.appendChild(title);

    const hint = document.createElement("div");
    hint.className = "te-hint";
    hint.textContent = "自定义颜色，下方实时预览";
    panel.appendChild(hint);

    // Base section
    const baseSection = document.createElement("div");
    baseSection.className = "te-section";
    const baseTitle = document.createElement("div");
    baseTitle.className = "te-section-title";
    baseTitle.textContent = "基础";
    baseSection.appendChild(baseTitle);

    const baseFields: Array<{ key: keyof CustomThemeColors; label: string }> = [
      { key: "background", label: "背景" },
      { key: "foreground", label: "前景" },
      { key: "accent", label: "强调色" },
      { key: "selection", label: "选中" },
    ];

    for (const field of baseFields) {
      this.createColorRow(baseSection, field.key, field.label);
    }
    panel.appendChild(baseSection);

    // Syntax section
    const syntaxSection = document.createElement("div");
    syntaxSection.className = "te-section";
    const syntaxTitle = document.createElement("div");
    syntaxTitle.className = "te-section-title";
    syntaxTitle.textContent = "语法";
    syntaxSection.appendChild(syntaxTitle);

    const syntaxFields: Array<{ key: keyof CustomThemeColors; label: string }> = [
      { key: "keyword", label: "关键字" },
      { key: "string", label: "字符串" },
      { key: "comment", label: "注释" },
      { key: "number", label: "数字" },
      { key: "function", label: "函数" },
      { key: "type", label: "类型" },
    ];

    for (const field of syntaxFields) {
      this.createColorRow(syntaxSection, field.key, field.label);
    }
    panel.appendChild(syntaxSection);

    // Preview
    this.previewEl = document.createElement("div");
    this.previewEl.className = "te-preview";
    panel.appendChild(this.previewEl);

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.className = "te-buttons";

    const applyBtn = document.createElement("button");
    applyBtn.className = "te-btn";
    applyBtn.textContent = "应用";
    applyBtn.addEventListener("click", () => {
      this.onApply(this.getColors());
    });
    btnRow.appendChild(applyBtn);

    const resetBtn = document.createElement("button");
    resetBtn.className = "te-btn secondary";
    resetBtn.textContent = "重置";
    resetBtn.addEventListener("click", () => {
      const existing = this.themeManager.getCustomThemeColors();
      if (existing) {
        this.setColors(existing);
      } else {
        this.setColors(DEFAULT_COLORS);
      }
      this.onApply(this.getColors());
    });
    btnRow.appendChild(resetBtn);

    panel.appendChild(btnRow);
    this.container.appendChild(panel);

    this.updatePreview();
  }

  private createColorRow(
    parent: HTMLElement,
    key: keyof CustomThemeColors,
    label: string
  ): void {
    const row = document.createElement("div");
    row.className = "te-row";

    const labelEl = document.createElement("div");
    labelEl.className = "te-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "te-color";
    colorInput.value = DEFAULT_COLORS[key];
    this.inputs[key] = colorInput;

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.className = "te-hex";
    hexInput.value = DEFAULT_COLORS[key];
    hexInput.maxLength = 7;
    this.hexInputs[key] = hexInput;

    colorInput.addEventListener("input", () => {
      hexInput.value = colorInput.value;
      this.updatePreview();
      this.onApply(this.getColors());
    });

    hexInput.addEventListener("input", () => {
      const val = hexInput.value;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        colorInput.value = val;
        this.updatePreview();
        this.onApply(this.getColors());
      }
    });

    hexInput.addEventListener("blur", () => {
      hexInput.value = colorInput.value;
    });

    row.appendChild(colorInput);
    row.appendChild(hexInput);
    parent.appendChild(row);
  }

  private updatePreview(): void {
    if (!this.previewEl) return;
    const c = this.getColors();
    this.previewEl.style.background = c.background;
    this.previewEl.style.color = c.foreground;
    this.previewEl.innerHTML = `<span style="color:${c.keyword}">function</span> <span style="color:${c.function}">hello</span>() {
  <span style="color:${c.keyword}">const</span> s = <span style="color:${c.string}">"hi"</span>; <span style="color:${c.comment}">// comment</span>
  <span style="color:${c.keyword}">return</span> <span style="color:${c.number}">42</span>;
}`;
  }

  getColors(): CustomThemeColors {
    return {
      background: this.inputs.background.value,
      foreground: this.inputs.foreground.value,
      accent: this.inputs.accent.value,
      selection: this.inputs.selection.value,
      keyword: this.inputs.keyword.value,
      string: this.inputs.string.value,
      comment: this.inputs.comment.value,
      number: this.inputs.number.value,
      function: this.inputs.function.value,
      type: this.inputs.type.value,
    };
  }

  setColors(colors: CustomThemeColors): void {
    const keys = Object.keys(colors) as Array<keyof CustomThemeColors>;
    for (const key of keys) {
      if (this.inputs[key]) {
        this.inputs[key].value = colors[key];
      }
      if (this.hexInputs[key]) {
        this.hexInputs[key].value = colors[key];
      }
    }
    this.updatePreview();
  }

  dispose(): void {
    this.container.innerHTML = "";
    this.previewEl = null;
  }
}
