declare module "monaco-editor" {
  namespace monaco {
    namespace editor {
      interface IStandaloneCodeEditor {
        [key: string]: any;
        setModel(model: ITextModel | null): void;
        getModel(): ITextModel | null;
        getAction(id: string): IAction | null;
        onDidChangeCursorPosition(listener: (e: ICursorPositionChangedEvent) => void): IDisposable;
        onDidFocusEditorText(listener: () => void): IDisposable;
        onDidChangeModelLanguage(listener: (e: IModelLanguageChangedEvent) => void): IDisposable;
        updateOptions(options: IEditorOptions): void;
        layout(): void;
        focus(): void;
        getDomNode(): HTMLElement | null;
        getSelection(): Range | null;
        executeEdits(source: string, edits: IIdentifiedSingleEditOperation[]): void;
        getValue(): string;
        setValue(value: string): void;
        trigger(source: string, handlerId: string, payload: unknown): void;
        onKeyDown(listener: (e: IKeyboardEvent) => void): IDisposable;
        getPosition(): Position | null;
        setPosition(position: Position): void;
        revealPositionInCenter(position: Position): void;
        getValueInRange(range: Range): string;
      }

      interface ITextModel {
        getValue(): string;
        setValue(value: string): void;
        getValueInRange(range: Range): string;
        getLanguageId(): string;
        onDidChangeContent(listener: (e: IModelContentChangedEvent) => void): IDisposable;
        dispose(): void;
        uri: Uri;
      }

      interface IDiffEditor {
        setModel(model: { original: ITextModel; modified: ITextModel }): void;
        layout(): void;
        dispose(): void;
        updateOptions(options: IEditorOptions): void;
        getDomNode(): HTMLElement | null;
      }

      interface IEditorOptions {
        value?: string;
        language?: string;
        theme?: string;
        fontSize?: number;
        fontFamily?: string;
        fontLigatures?: boolean;
        readOnly?: boolean;
        originalEditable?: boolean;
        renderSideBySide?: boolean;
        tabSize?: number;
        lineNumbers?: string | number;
        wordWrap?: string;
        minimap?: { enabled: boolean; renderCharacters?: boolean };
        bracketPairColorization?: { enabled: boolean };
        guides?: { bracketPairs: boolean; indentation: boolean };
        smoothScrolling?: boolean;
        cursorBlinking?: string;
        cursorSmoothCaretAnimation?: string;
        padding?: { top: number; bottom: number };
        renderLineHighlight?: string;
        roundedSelection?: boolean;
        scrollBeyondLastLine?: boolean;
        automaticLayout?: boolean;
        scrollbar?: {
          verticalScrollbarSize?: number;
          horizontalScrollbarSize?: number;
          useShadows?: boolean;
          verticalSliderSize?: number;
          horizontalSliderSize?: number;
        };
        folding?: boolean;
        foldingHighlight?: boolean;
        showFoldingControls?: string;
        breadcrumbs?: { enabled: boolean; height: number };
        links?: boolean;
        quickSuggestions?: { other: boolean; comments: boolean; strings: boolean };
        suggestOnTriggerCharacters?: boolean;
        tabCompletion?: string;
        wordBasedSuggestions?: string;
        matchBrackets?: string;
        renderWhitespace?: string;
        unicodeHighlight?: { ambiguousCharacters: boolean };
        stickyScroll?: { enabled: boolean };
        multiCursorModifier?: string;
        autoClosingBrackets?: string;
        formatOnPaste?: boolean;
        formatOnType?: boolean;
        linkedEditing?: boolean;
        mouseWheelZoom?: boolean;
        cursorSurroundingLines?: number;
      }

      interface IAction {
        run(): Promise<void>;
      }

      interface ICursorPositionChangedEvent {
        position: Position;
      }

      interface IModelLanguageChangedEvent {
        newLanguage: string;
      }

      interface IModelContentChangedEvent {}

      interface IIdentifiedSingleEditOperation {
        range: Range;
        text: string;
      }

      interface IDisposable {
        dispose(): void;
      }

      interface IKeyboardEvent {
        key: string;
        code: string;
        ctrlKey: boolean;
        shiftKey: boolean;
        altKey: boolean;
        metaKey: boolean;
      }

      interface Position {
        lineNumber: number;
        column: number;
      }

      interface Range {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      }

      const create: (domElement: HTMLElement, options: IEditorOptions) => IStandaloneCodeEditor;
      const createDiffEditor: (domElement: HTMLElement, options: IEditorOptions) => IDiffEditor;
      const setTheme: (theme: string) => void;
      const defineTheme: (name: string, data: unknown) => void;
      const setModelLanguage: (model: ITextModel, languageId: string) => void;
      const createModel: (value: string, language: string, uri: Uri) => ITextModel;
    }

    namespace languages {
      interface CompletionItem {
        label: string;
        kind: CompletionItemKind;
        detail?: string;
        documentation?: string;
        insertText: string;
        insertTextRules: CompletionItemInsertTextRule;
        range: Range | null;
      }

      const CompletionItemKind: {
        Text: 0;
        Method: 1;
        Function: 2;
        Constructor: 3;
        Field: 4;
        Variable: 5;
        Class: 6;
        Interface: 7;
        Module: 8;
        Property: 9;
        Unit: 10;
        Value: 11;
        Enum: 12;
        Keyword: 13;
        Snippet: 14;
        Color: 15;
        File: 16;
        Reference: 17;
        Folder: 18;
        EnumMember: 19;
        Constant: 20;
        Struct: 21;
        Event: 22;
        Operator: 23;
        TypeParameter: 24;
      };

      const CompletionItemInsertTextRule: {
        None: 0;
        KeepWhitespace: 1;
        InsertAsSnippet: 4;
      };

      interface CompletionList {
        suggestions: CompletionItem[];
      }

      type ProviderResult<T> = T | Promise<T> | null;

      interface DocumentSymbol {
        name: string;
        detail: string;
        kind: SymbolKind;
        range: Range;
        selectionRange: Range;
        children: DocumentSymbol[];
      }

      const SymbolKind: {
        File: 0;
        Module: 1;
        Namespace: 2;
        Package: 3;
        Class: 4;
        Method: 5;
        Property: 6;
        Field: 7;
        Constructor: 8;
        Enum: 9;
        Interface: 10;
        Function: 11;
        Variable: 12;
        Constant: 13;
        String: 14;
        Number: 15;
        Boolean: 16;
        Array: 17;
        Object: 18;
        Key: 19;
        Null: 20;
        EnumMember: 21;
        Struct: 22;
        Event: 23;
        Operator: 24;
        TypeParameter: 25;
      };

      interface DocumentSymbolProvider {
        provideDocumentSymbols(model: editor.ITextModel): ProviderResult<DocumentSymbol[]>;
      }

      function registerCompletionItemProvider(languageId: string, provider: CompletionItemProvider): IDisposable;
      function registerDocumentSymbolProvider(languageId: string, provider: DocumentSymbolProvider): IDisposable;

      interface CompletionItemProvider {
        provideCompletionItems(model: editor.ITextModel, position: Position): ProviderResult<CompletionList>;
      }
    }

    class Uri {
      static file(path: string): Uri;
      static parse(uri: string): Uri;
      fsPath: string;
    }

    class Range {
      constructor(startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number);
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    }

    class Position {
      constructor(lineNumber: number, column: number);
      lineNumber: number;
      column: number;
    }
  }

  export = monaco;
}

declare const monaco: typeof import("monaco-editor");