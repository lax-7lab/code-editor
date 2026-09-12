import * as monaco from "monaco-editor";

export class FormatService {
  static async format(editor: monaco.editor.IStandaloneCodeEditor): Promise<void> {
    const action = editor.getAction("editor.action.formatDocument");
    if (action) {
      await action.run();
    }
  }

  static async formatSelection(editor: monaco.editor.IStandaloneCodeEditor): Promise<void> {
    const action = editor.getAction("editor.action.formatSelection");
    if (action) {
      await action.run();
    }
  }
}