import * as monaco from 'monaco-editor/editor/editor.api.js'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import { loader } from '@monaco-editor/react'

globalThis.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

export function configureEditor() {
  if (!monaco.languages.getLanguages().some(language => language.id === 'flowchart')) {
    monaco.languages.register({ id: 'flowchart' })
    monaco.languages.setMonarchTokensProvider('flowchart', {
      tokenizer: { root: [
        [/%%.*$/, 'comment'], [/\b(C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|title|classDef|class|style|flowchart|erDiagram|direction|PK|FK|UK|TB|sequenceDiagram|alt|else|loop|opt|activate|deactivate|Note|note|over|left|right|of|box|autonumber|actor|participant|as|subgraph|end|LR|RL|TD|BT)\b/, 'keyword'],
        [/\b(?:Person|System|Container|Component)(?:Db|Queue)?(?:_Ext)?\b|\b(?:Rel|BiRel|Rel_Back|RelIndex|Deployment_Node|Node_L|Node_R|Node|Boundary|Enterprise_Boundary|System_Boundary|Container_Boundary)\b/, 'keyword'],
        [/<[-=.]+>|[-=.~]{2,}[>ox]?|[ox][-=.]+[ox]|:::|&/, 'operator'], [/\|[^|]*\|/, 'string'], [/"[^"]*"|'[^']*'/, 'string'],
        [/[()[\]{}]/, 'delimiter'], [/[a-zA-Z_][\w-]*/, 'identifier'],
      ] },
    })
    monaco.languages.setLanguageConfiguration('flowchart', {
      comments: { lineComment: '%%' }, brackets: [['[', ']'], ['(', ')'], ['{', '}']],
      autoClosingPairs: [{ open: '[', close: ']' }, { open: '(', close: ')' }, { open: '{', close: '}' }, { open: '"', close: '"' }],
    })
  }
  monaco.editor.defineTheme('flowlab-paper', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'keyword', foreground: '416b58', fontStyle: 'bold' },
      { token: 'identifier', foreground: '454c49' }, { token: 'operator', foreground: '8a6c3f' },
      { token: 'delimiter', foreground: '7d827b' }, { token: 'string', foreground: '5d7368' },
      { token: 'comment', foreground: '94978c', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#faf9f5', 'editor.foreground': '#373e39',
      'editorLineNumber.foreground': '#a5a99e', 'editorLineNumber.activeForeground': '#536557',
      'editor.lineHighlightBackground': '#f1f1e9', 'editor.selectionBackground': '#dce6db',
      'editorCursor.foreground': '#416b58', 'editorIndentGuide.background1': '#e5e6dc',
      'editorWidget.background': '#faf9f5', 'editorWidget.border': '#d8dbcf',
      'editorGutter.background': '#faf9f5', 'editorError.foreground': '#a34d36',
    },
  })
}
export { monaco }
