import * as monaco from "monaco-editor";
import type { OutlineSymbol, OutlineSymbolKind } from "../types";

let providersRegistered = false;

export class OutlineScanner {
  static scan(content: string, language: string): OutlineSymbol[] {
    const symbols: OutlineSymbol[] = [];
    const lines = content.split("\n");

    switch (language) {
      case "typescript":
      case "javascript":
        this.scanTypeScriptJavaScript(lines, symbols);
        break;
      case "python":
        this.scanPython(lines, symbols);
        break;
      case "java":
        this.scanJava(lines, symbols);
        break;
      case "c":
      case "cpp":
        this.scanCCpp(lines, symbols);
        break;
      case "csharp":
        this.scanCSharp(lines, symbols);
        break;
      case "go":
        this.scanGo(lines, symbols);
        break;
      case "rust":
        this.scanRust(lines, symbols);
        break;
      case "html":
        this.scanHtml(lines, symbols);
        break;
      case "css":
      case "scss":
        this.scanCss(lines, symbols);
        break;
      case "markdown":
        this.scanMarkdown(lines, symbols);
        break;
      case "json":
        return [];
      default:
        this.scanGeneric(lines, symbols);
    }

    return symbols.sort((a, b) => a.line - b.line);
  }

  private static scanTypeScriptJavaScript(lines: string[], symbols: OutlineSymbol[]): void {
    const patterns = [
      { regex: /^\s*export\s+(async\s+)?function\s+(\w+)/, kind: "function" as OutlineSymbolKind },
      { regex: /^\s*export\s+class\s+(\w+)/, kind: "class" as OutlineSymbolKind },
      { regex: /^\s*export\s+interface\s+(\w+)/, kind: "interface" as OutlineSymbolKind },
      { regex: /^\s*export\s+const\s+(\w+)\s*=\s*(async\s+)?\(/, kind: "function" as OutlineSymbolKind },
      { regex: /^\s*export\s+const\s+(\w+)\s*=\s*\(/, kind: "function" as OutlineSymbolKind },
      { regex: /^\s*(async\s+)?function\s+(\w+)\s*\(/, kind: "function" as OutlineSymbolKind },
      { regex: /^\s*class\s+(\w+)/, kind: "class" as OutlineSymbolKind },
      { regex: /^\s*interface\s+(\w+)/, kind: "interface" as OutlineSymbolKind },
      { regex: /^\s*const\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>/, kind: "function" as OutlineSymbolKind },
      { regex: /^\s*const\s+(\w+)\s*=\s*\([^)]*\)\s*\{/, kind: "function" as OutlineSymbolKind },
      { regex: /^\s*let\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>/, kind: "function" as OutlineSymbolKind },
      { regex: /^\s*(\w+)\s*\([^)]*\)\s*\{/, kind: "method" as OutlineSymbolKind },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { regex, kind } of patterns) {
        const match = line.match(regex);
        if (match) {
          const name = match[match.length - 1];
          symbols.push({
            name,
            kind,
            line: i + 1,
            column: line.indexOf(name) + 1,
            detail: line.trim(),
          });
          break;
        }
      }
    }
  }

  private static scanPython(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const defMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
      if (defMatch) {
        symbols.push({
          name: defMatch[1],
          kind: "function",
          line: i + 1,
          column: line.indexOf(defMatch[1]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const classMatch = line.match(/^\s*class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: "class",
          line: i + 1,
          column: line.indexOf(classMatch[1]) + 1,
          detail: line.trim(),
        });
      }
    }
  }

  private static scanJava(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classMatch = line.match(/^\s*(public\s+|private\s+|protected\s+)?(abstract\s+)?(class|interface|enum)\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[4],
          kind: classMatch[3] === "interface" ? "interface" : "class",
          line: i + 1,
          column: line.indexOf(classMatch[4]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const methodMatch = line.match(/^\s*(public|private|protected|static|\s)+\s+\w+\s+(\w+)\s*\([^)]*\)\s*\{?/);
      if (methodMatch) {
        symbols.push({
          name: methodMatch[2],
          kind: "method",
          line: i + 1,
          column: line.indexOf(methodMatch[2]) + 1,
          detail: line.trim(),
        });
      }
    }
  }

  private static scanCCpp(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const structClassMatch = line.match(/^\s*(struct|class)\s+(\w+)/);
      if (structClassMatch) {
        symbols.push({
          name: structClassMatch[2],
          kind: "class",
          line: i + 1,
          column: line.indexOf(structClassMatch[2]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const funcMatch = line.match(/^\s*(\w[\w\s\*&:<>]*)\s+(\w+)\s*\([^)]*\)\s*\{/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[2],
          kind: "function",
          line: i + 1,
          column: line.indexOf(funcMatch[2]) + 1,
          detail: line.trim(),
        });
      }
    }
  }

  private static scanCSharp(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const typeMatch = line.match(/^\s*(public|private|protected|internal)?\s*(class|struct|interface|enum)\s+(\w+)/);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[3],
          kind: typeMatch[2] === "interface" ? "interface" : "class",
          line: i + 1,
          column: line.indexOf(typeMatch[3]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const methodMatch = line.match(/^\s*(public|private|protected|internal|static|virtual|override|async|\s)+\s+\w+\s+(\w+)\s*\([^)]*\)\s*\{?/);
      if (methodMatch) {
        symbols.push({
          name: methodMatch[2],
          kind: "method",
          line: i + 1,
          column: line.indexOf(methodMatch[2]) + 1,
          detail: line.trim(),
        });
      }
    }
  }

  private static scanGo(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/^\s*func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: "function",
          line: i + 1,
          column: line.indexOf(funcMatch[1]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const typeMatch = line.match(/^\s*type\s+(\w+)\s+(struct|interface)/);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          kind: typeMatch[2] === "interface" ? "interface" : "class",
          line: i + 1,
          column: line.indexOf(typeMatch[1]) + 1,
          detail: line.trim(),
        });
      }
    }
  }

  private static scanRust(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fnMatch = line.match(/^\s*(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/);
      if (fnMatch) {
        symbols.push({
          name: fnMatch[3],
          kind: "function",
          line: i + 1,
          column: line.indexOf(fnMatch[3]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const structMatch = line.match(/^\s*(pub\s+)?struct\s+(\w+)/);
      if (structMatch) {
        symbols.push({
          name: structMatch[2],
          kind: "class",
          line: i + 1,
          column: line.indexOf(structMatch[2]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const enumMatch = line.match(/^\s*(pub\s+)?enum\s+(\w+)/);
      if (enumMatch) {
        symbols.push({
          name: enumMatch[2],
          kind: "class",
          line: i + 1,
          column: line.indexOf(enumMatch[2]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const implMatch = line.match(/^\s*impl\s+(?:<[^>]*>\s+)?(\w+)/);
      if (implMatch) {
        symbols.push({
          name: `impl ${implMatch[1]}`,
          kind: "class",
          line: i + 1,
          column: line.indexOf(implMatch[1]) + 1,
          detail: line.trim(),
        });
        continue;
      }
      const traitMatch = line.match(/^\s*(pub\s+)?trait\s+(\w+)/);
      if (traitMatch) {
        symbols.push({
          name: traitMatch[2],
          kind: "interface",
          line: i + 1,
          column: line.indexOf(traitMatch[2]) + 1,
          detail: line.trim(),
        });
      }
    }
  }

  private static scanHtml(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = line.match(/<(\w+)[^>]*\s+id\s*=\s*["']([^"']+)["']/);
      if (idMatch) {
        symbols.push({
          name: `#${idMatch[2]}`,
          kind: "tag",
          line: i + 1,
          column: line.indexOf(idMatch[0]) + 1,
          detail: `<${idMatch[1]} id="${idMatch[2]}">`,
        });
        continue;
      }
      const classMatch = line.match(/<(\w+)[^>]*\s+class\s*=\s*["']([^"']+)["']/);
      if (classMatch) {
        symbols.push({
          name: `.${classMatch[2].split(/\s+/)[0]}`,
          kind: "tag",
          line: i + 1,
          column: line.indexOf(classMatch[0]) + 1,
          detail: `<${classMatch[1]} class="${classMatch[2]}">`,
        });
      }
    }
  }

  private static scanCss(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const selectorMatch = line.match(/^\s*([^{]+)\s*\{/);
      if (selectorMatch && !line.trim().startsWith("@")) {
        const selector = selectorMatch[1].trim();
        if (selector) {
          symbols.push({
            name: selector,
            kind: "other",
            line: i + 1,
            column: line.indexOf(selector) + 1,
            detail: line.trim(),
          });
        }
      }
    }
  }

  private static scanMarkdown(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        symbols.push({
          name: headingMatch[2].trim(),
          kind: "section",
          line: i + 1,
          column: 1,
          detail: headingMatch[1],
        });
      }
    }
  }

  private static scanGeneric(lines: string[], symbols: OutlineSymbol[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/^\s*(function|def|fn|func|sub)\s+(\w+)/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[2],
          kind: "function",
          line: i + 1,
          column: line.indexOf(funcMatch[2]) + 1,
          detail: line.trim(),
        });
      }
    }
  }

  static registerMonacoProviders(): void {
    if (providersRegistered) return;
    providersRegistered = true;

    const languagesWithoutNativeSupport = [
      "python",
      "java",
      "c",
      "cpp",
      "csharp",
      "go",
      "rust",
      "markdown",
      "css",
      "scss",
      "html",
      "xml",
      "php",
      "ruby",
      "shell",
    ];

    for (const lang of languagesWithoutNativeSupport) {
      monaco.languages.registerDocumentSymbolProvider(lang, {
        provideDocumentSymbols: (model) => {
          const symbols = this.scan(model.getValue(), model.getLanguageId());
          return symbols.map((s) => {
            const kind = this.mapKindToMonaco(s.kind);
            const range = new monaco.Range(s.line, s.column, s.line, s.column + s.name.length);
            const selectionRange = range;
            return {
              name: s.name,
              detail: s.detail ?? "",
              kind,
              range,
              selectionRange,
              children: [],
            };
          });
        },
      });
    }
  }

  private static mapKindToMonaco(kind: OutlineSymbolKind): number {
    switch (kind) {
      case "function":
        return monaco.languages.SymbolKind.Function;
      case "method":
        return monaco.languages.SymbolKind.Method;
      case "class":
        return monaco.languages.SymbolKind.Class;
      case "interface":
        return monaco.languages.SymbolKind.Interface;
      case "variable":
        return monaco.languages.SymbolKind.Variable;
      case "tag":
        return monaco.languages.SymbolKind.Property;
      case "section":
        return monaco.languages.SymbolKind.Module;
      default:
        return monaco.languages.SymbolKind.Variable;
    }
  }
}