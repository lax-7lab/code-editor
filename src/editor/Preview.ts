import { marked } from "marked";

export interface PreviewOptions {
  onError?: (message: string) => void;
}

export class Preview {
  private container: HTMLElement;
  private content: string = "";
  private language: string = "plaintext";
  private visible: boolean = false;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private markdownContainer: HTMLDivElement | null = null;
  private emptyContainer: HTMLDivElement | null = null;
  private errorContainer: HTMLDivElement | null = null;
  private onError?: (message: string) => void;

  constructor(container: HTMLElement, options: PreviewOptions = {}) {
    this.container = container;
    this.onError = options.onError;
    this.container.style.display = "none";
    this.container.style.position = "relative";
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.overflow = "hidden";
  }

  show(): void {
    this.visible = true;
    this.container.style.display = "block";
    this.refresh();
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = "none";
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): boolean {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }

  setContent(content: string): void {
    this.content = content;
    if (this.visible) {
      this.debouncedRender();
    }
  }

  setLanguage(language: string): void {
    this.language = language.toLowerCase();
    if (this.visible) {
      this.refresh();
    }
  }

  refresh(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    this.render(this.content, this.language);
  }

  private debouncedRender(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
    }
    this.renderTimer = setTimeout(() => {
      this.render(this.content, this.language);
      this.renderTimer = null;
    }, 300);
  }

  private async render(content: string, language: string): Promise<void> {
    this.clearContainers();

    const normalizedLang = language.toLowerCase();

    if (normalizedLang === "markdown" || normalizedLang === "md") {
      await this.renderMarkdown(content);
    } else if (
      normalizedLang === "html" ||
      normalizedLang === "htm" ||
      normalizedLang === "xhtml"
    ) {
      this.renderHtml(content);
    } else {
      this.renderEmpty();
    }
  }

  private async renderMarkdown(content: string): Promise<void> {
    this.markdownContainer = document.createElement("div");
    this.markdownContainer.className = "markdown-preview preview-md";
    this.markdownContainer.style.position = "absolute";
    this.markdownContainer.style.inset = "0";
    this.markdownContainer.style.overflowY = "auto";
    this.markdownContainer.style.padding = "24px 32px";
    this.markdownContainer.style.background = "var(--surface)";
    this.markdownContainer.style.fontFamily = "var(--font-ui)";
    this.markdownContainer.style.lineHeight = "1.6";

    try {
      const html = await marked.parse(content);
      this.markdownContainer.innerHTML = html as string;
      this.container.appendChild(this.markdownContainer);
    } catch (error) {
      this.showError(
        `Markdown render error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private renderHtml(content: string): void {
    this.iframe = document.createElement("iframe");
    this.iframe.className = "preview-frame";
    this.iframe.sandbox = "allow-scripts";
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.border = "none";
    this.iframe.style.background = "#fff";
    this.iframe.srcdoc = content;
    this.container.appendChild(this.iframe);
  }

  private renderEmpty(): void {
    this.emptyContainer = document.createElement("div");
    this.emptyContainer.className = "panel-empty";
    this.emptyContainer.style.display = "flex";
    this.emptyContainer.style.alignItems = "center";
    this.emptyContainer.style.justifyContent = "center";
    this.emptyContainer.style.padding = "24px";
    this.emptyContainer.style.color = "var(--text-muted)";
    this.emptyContainer.style.fontSize = "12px";
    this.emptyContainer.style.fontStyle = "italic";
    this.emptyContainer.style.opacity = "0.6";
    this.emptyContainer.textContent =
      "No preview for this file type (HTML or Markdown only)";
    this.container.appendChild(this.emptyContainer);
  }

  private showError(message: string): void {
    this.errorContainer = document.createElement("div");
    this.errorContainer.className = "preview-error";
    this.errorContainer.style.display = "flex";
    this.errorContainer.style.alignItems = "center";
    this.errorContainer.style.justifyContent = "center";
    this.errorContainer.style.padding = "24px";
    this.errorContainer.style.color = "var(--text-muted)";
    this.errorContainer.style.fontSize = "12px";
    this.errorContainer.style.opacity = "0.7";
    this.errorContainer.textContent = message;
    this.container.appendChild(this.errorContainer);

    if (this.onError) {
      this.onError(message);
    }
  }

  private clearContainers(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.markdownContainer) {
      this.markdownContainer.remove();
      this.markdownContainer = null;
    }
    if (this.emptyContainer) {
      this.emptyContainer.remove();
      this.emptyContainer = null;
    }
    if (this.errorContainer) {
      this.errorContainer.remove();
      this.errorContainer = null;
    }
  }

  dispose(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    this.clearContainers();
  }
}