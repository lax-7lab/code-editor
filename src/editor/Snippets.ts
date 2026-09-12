import * as monaco from "monaco-editor";

let snippetsRegistered = false;

export function registerSnippets(): void {
  if (snippetsRegistered) return;
  snippetsRegistered = true;

  const tsJsSnippets = [
    { label: "if", detail: "if statement", body: "if (${1:condition}) {\n\t${2}\n}" },
    { label: "ifelse", detail: "if/else statement", body: "if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}" },
    { label: "for", detail: "for loop", body: "for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3}\n}" },
    { label: "forof", detail: "for...of loop", body: "for (const ${1:item} of ${2:iterable}) {\n\t${3}\n}" },
    { label: "while", detail: "while loop", body: "while (${1:condition}) {\n\t${2}\n}" },
    { label: "try", detail: "try/catch block", body: "try {\n\t${1}\n} catch (${2:error}) {\n\t${3}\n}" },
    { label: "catch", detail: "catch block", body: "catch (${1:error}) {\n\t${2}\n}" },
    { label: "function", detail: "function declaration", body: "function ${1:name}(${2:params}) {\n\t${3}\n}" },
    { label: "arrow", detail: "arrow function", body: "const ${1:name} = (${2:params}) => {\n\t${3}\n};" },
    { label: "class", detail: "class declaration", body: "class ${1:name} {\n\tconstructor(${2:params}) {\n\t\t${3}\n\t}\n}" },
    { label: "console.log", detail: "console.log", body: "console.log(${1});" },
  ];

  const javaCppCSharpSnippets = [
    { label: "if", detail: "if statement", body: "if (${1:condition}) {\n\t${2}\n}" },
    { label: "ifelse", detail: "if/else statement", body: "if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}" },
    { label: "for", detail: "for loop", body: "for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3}\n}" },
    { label: "while", detail: "while loop", body: "while (${1:condition}) {\n\t${2}\n}" },
    { label: "try", detail: "try/catch block", body: "try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${4}\n}" },
    { label: "catch", detail: "catch block", body: "catch (${1:Exception} ${2:e}) {\n\t${3}\n}" },
    { label: "function", detail: "function/method", body: "${1:public} ${2:void} ${3:name}(${4:params}) {\n\t${5}\n}" },
    { label: "class", detail: "class declaration", body: "class ${1:name} {\n\t${2}\n}" },
  ];

  const pythonSnippets = [
    { label: "if", detail: "if statement", body: "if ${1:condition}:\n\t${2}" },
    { label: "ifelse", detail: "if/else statement", body: "if ${1:condition}:\n\t${2}\nelse:\n\t${3}" },
    { label: "for", detail: "for loop", body: "for ${1:item} in ${2:iterable}:\n\t${3}" },
    { label: "while", detail: "while loop", body: "while ${1:condition}:\n\t${2}" },
    { label: "try", detail: "try/except block", body: "try:\n\t${1}\nexcept ${2:Exception} as ${3:e}:\n\t${4}" },
    { label: "def", detail: "function definition", body: "def ${1:name}(${2:params}):\n\t${3}" },
    { label: "class", detail: "class definition", body: "class ${1:name}:\n\tdef __init__(self, ${2:params}):\n\t\t${3}" },
    { label: "main", detail: "main guard", body: "if __name__ == \"__main__\":\n\t${1}" },
  ];

  const htmlSnippets = [
    { label: "html5", detail: "HTML5 skeleton", body: "<!DOCTYPE html>\n<html lang=\"${1:en}\">\n<head>\n\t<meta charset=\"UTF-8\">\n\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\t<title>${2:Document}</title>\n</head>\n<body>\n\t${3}\n</body>\n</html>" },
    { label: "div", detail: "div element", body: "<div${1: class=\"${2}\"}>${3}</div>" },
    { label: "ul", detail: "unordered list", body: "<ul>\n\t<li>${1:Item}</li>\n</ul>" },
    { label: "a", detail: "anchor link", body: "<a href=\"${1:#}\">${2:Link}</a>" },
    { label: "img", detail: "image", body: "<img src=\"${1:path}\" alt=\"${2:description}\">" },
    { label: "script", detail: "script tag", body: "<script${1: src=\"${2}\"}>${3}</script>" },
    { label: "style", detail: "style tag", body: "<style>\n${1}\n</style>" },
    { label: "link", detail: "link stylesheet", body: "<link rel=\"stylesheet\" href=\"${1:style.css}\">" },
  ];

  const cssSnippets = [
    { label: "flex", detail: "flexbox container", body: "display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};" },
    { label: "grid", detail: "grid container", body: "display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:1rem};" },
    { label: "media", detail: "media query", body: "@media (${1:max-width: 768px}) {\n\t${2}\n}" },
  ];

  const markdownSnippets = [
    { label: "codefence", detail: "code fence", body: "```${1:language}\n${2}\n```" },
    { label: "link", detail: "markdown link", body: "[${1:text}](${2:url})" },
    { label: "image", detail: "markdown image", body: "![${1:alt}](${2:url})" },
    { label: "table", detail: "markdown table", body: "| ${1:Header} | ${2:Header} |\n| --- | --- |\n| ${3:Cell} | ${4:Cell} |" },
  ];

  function registerForLanguages(languages: string[], snippets: Array<{ label: string; detail: string; body: string }>): void {
    for (const lang of languages) {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: () => {
          const suggestions = snippets.map((s) => ({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: s.detail,
            documentation: s.detail,
            insertText: s.body,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: null as any,
          }));
          return { suggestions };
        },
      });
    }
  }

  registerForLanguages(["typescript", "javascript"], tsJsSnippets);
  registerForLanguages(["java", "c", "cpp", "csharp"], javaCppCSharpSnippets);
  registerForLanguages(["python"], pythonSnippets);
  registerForLanguages(["html"], htmlSnippets);
  registerForLanguages(["css", "scss"], cssSnippets);
  registerForLanguages(["markdown"], markdownSnippets);
}