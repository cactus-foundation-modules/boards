import { codeToHtml, createCssVariablesTheme } from 'shiki'
import CodeCopyButton from './CodeCopyButton'

export type BoardsCodeProps = { code?: string; language?: string }

const LANGUAGE_OPTIONS = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'bash', label: 'Bash' },
  { value: 'css', label: 'CSS' },
  { value: 'diff', label: 'Diff' },
  { value: 'go', label: 'Go' },
  { value: 'html', label: 'HTML' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'jsx', label: 'JSX' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'php', label: 'PHP' },
  { value: 'python', label: 'Python' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'swift', label: 'Swift' },
  { value: 'tsx', label: 'TSX' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'yaml', label: 'YAML' },
]

const cssVariablesTheme = createCssVariablesTheme({ name: 'cactus', variablePrefix: '--brd-shiki-' })

export function BoardsCode({ code = '', language = 'plaintext' }: BoardsCodeProps) {
  return (
    <figure className="brd-code">
      <div className="brd-code-header">
        <span className="brd-code-lang">{language}</span>
        <CodeCopyButton code={code} />
      </div>
      <pre className="brd-code-pre"><code>{code}</code></pre>
    </figure>
  )
}

export async function BoardsCodeRsc({ code = '', language = 'plaintext' }: BoardsCodeProps) {
  let html = ''
  try {
    html = await codeToHtml(code, { lang: language, theme: cssVariablesTheme })
  } catch {
    html = `<pre class="brd-code-pre"><code>${code.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))}</code></pre>`
  }
  return (
    <figure className="brd-code">
      <div className="brd-code-header">
        <span className="brd-code-lang">{language}</span>
        <CodeCopyButton code={code} />
      </div>
      <div className="brd-code-highlighted" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  )
}

export const boardsCodeFieldDef = {
  label: 'Code',
  fields: {
    code: { type: 'textarea' as const, label: 'Code' },
    language: { type: 'select' as const, label: 'Language', options: LANGUAGE_OPTIONS },
  },
  defaultProps: { code: '', language: 'plaintext' },
  render: BoardsCode,
}
