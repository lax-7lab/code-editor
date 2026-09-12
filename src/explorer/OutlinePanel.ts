import { OutlineSymbol, OutlineSymbolKind } from "../types";

interface OutlinePanelCallbacks {
  onJump: (line: number, column: number) => void;
}

export class OutlinePanel {
  private container: HTMLElement;
  private callbacks: OutlinePanelCallbacks;
  private listElement: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: OutlinePanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  private getKindGlyph(kind: OutlineSymbolKind): string {
    switch (kind) {
      case "function":
      case "method":
        return "ƒ";
      case "class":
        return "C";
      case "interface":
        return "I";
      case "variable":
        return "v";
      case "tag":
        return "<>";
      case "section":
        return "#";
      default:
        return "•";
    }
  }

  private render(): void {
    this.container.innerHTML = "";
    this.listElement = document.createElement("div");
    this.listElement.className = "panel-list";
    this.container.appendChild(this.listElement);
  }

  public setSymbols(symbols: OutlineSymbol[]): void {
    if (!this.listElement) return;

    this.listElement.innerHTML = "";

    if (symbols.length === 0) {
      const empty = document.createElement("div");
      empty.className = "panel-empty";
      empty.textContent = "没有符号";
      this.listElement.appendChild(empty);
      return;
    }

    for (const symbol of symbols) {
      const item = document.createElement("div");
      item.className = "panel-item";
      item.dataset.line = String(symbol.line);
      item.dataset.column = String(symbol.column);

      const iconSpan = document.createElement("span");
      iconSpan.className = "panel-item-icon";
      iconSpan.textContent = this.getKindGlyph(symbol.kind);
      item.appendChild(iconSpan);

      const textSpan = document.createElement("span");
      textSpan.className = "panel-item-text";
      textSpan.textContent = symbol.name;
      if (symbol.detail) {
        textSpan.textContent += ` ${symbol.detail}`;
      }
      item.appendChild(textSpan);

      const metaSpan = document.createElement("span");
      metaSpan.className = "panel-item-meta";
      metaSpan.textContent = `${symbol.line}:${symbol.column}`;
      item.appendChild(metaSpan);

      item.addEventListener("click", () => {
        this.callbacks.onJump(symbol.line, symbol.column);
      });

      this.listElement!.appendChild(item);
    }
  }

  public clear(): void {
    if (this.listElement) {
      this.listElement.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "panel-empty";
      empty.textContent = "没有符号";
      this.listElement.appendChild(empty);
    }
  }
}