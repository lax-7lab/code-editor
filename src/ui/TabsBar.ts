interface TabCallbacks {
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

interface TabData {
  id: string;
  name: string;
  isDirty: boolean;
}

export class TabsBar {
  private container: HTMLElement;
  private callbacks: TabCallbacks;
  private tabs: TabData[] = [];
  private activeTabId: string | null = null;

  constructor(container: HTMLElement, callbacks: TabCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    container.classList.add("tabs-bar");
    this.render();
  }

  setTabs(tabs: TabData[]): void {
    this.tabs = tabs;
    this.render();
  }

  setActive(tabId: string): void {
    this.activeTabId = tabId;
    this.updateHighlight();
  }

  private render(): void {
    this.container.innerHTML = "";

    if (this.tabs.length === 0) {
      const hint = document.createElement("div");
      hint.className = "tabs-empty";
      hint.textContent = "没有打开的文件";
      this.container.appendChild(hint);
      return;
    }

    const scrollWrap = document.createElement("div");
    scrollWrap.className = "tabs-scroll";

    for (const tab of this.tabs) {
      const item = document.createElement("div");
      item.className = "tab-item";
      item.setAttribute("data-tab-id", tab.id);

      if (tab.id === this.activeTabId) {
        item.classList.add("active");
      }

      const nameSpan = document.createElement("span");
      nameSpan.className = "tab-name";
      nameSpan.textContent = tab.name;
      item.appendChild(nameSpan);

      if (tab.isDirty) {
        const dot = document.createElement("span");
        dot.className = "tab-dirty";
        dot.textContent = "●";
        item.appendChild(dot);
      }

      const closeBtn = document.createElement("button");
      closeBtn.className = "tab-close";
      closeBtn.innerHTML = `<svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`;
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.callbacks.onClose(tab.id);
      });
      item.appendChild(closeBtn);

      item.addEventListener("click", () => this.callbacks.onSelect(tab.id));
      item.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          this.callbacks.onClose(tab.id);
        }
      });

      scrollWrap.appendChild(item);
    }

    this.container.appendChild(scrollWrap);
  }

  private updateHighlight(): void {
    const items = this.container.querySelectorAll(".tab-item");
    items.forEach((item) => {
      const el = item as HTMLElement;
      el.classList.toggle("active", el.getAttribute("data-tab-id") === this.activeTabId);
    });
  }
}
