'use client'

import { useState } from 'react'
import { InfoTip } from '@/components/admin/InfoTip'

type Result = { boardsImported: number; threadsImported: number; postsImported: number; skipped: number; errors: number } | null

export default function ImportWizard() {
  const [type, setType] = useState<'phpbb' | 'discourse'>('phpbb')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(dryRun: boolean) {
    if (!file) return
    setBusy(true)
    setError(null)
    const formData = new FormData()
    formData.append('type', type)
    formData.append('dryRun', String(dryRun))
    formData.append('files', file)

    const res = await fetch('/api/m/boards/admin/import', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Import failed')
    } else {
      setResult(data)
    }
    setBusy(false)
  }

  return (
    <div className="card">
      <div className="card-title">
        Import a forum
        <InfoTip>Re-running an import is safe: threads and posts already imported are skipped, never duplicated.</InfoTip>
      </div>
      <p className="field-hint">Bring in an existing forum from a phpBB XML export or a Discourse JSON export.</p>

      <div className="field">
        <span style={{ display: 'block', marginBottom: '0.375rem', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text)' }}>Exported from</span>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <label className="settings-check"><input type="radio" checked={type === 'phpbb'} onChange={() => setType('phpbb')} /> phpBB (XML)</label>
          <label className="settings-check"><input type="radio" checked={type === 'discourse'} onChange={() => setType('discourse')} /> Discourse (JSON)</label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="boards-import-file">Export file</label>
        <input id="boards-import-file" type="file" accept={type === 'phpbb' ? '.xml' : '.json'} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!file || busy} onClick={() => run(true)}>Preview (dry run)</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!file || busy} onClick={() => run(false)}>Import</button>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {result && (
        <div className="alert alert-success" role="status">
          Boards: {result.boardsImported}, threads: {result.threadsImported}, posts: {result.postsImported}, skipped: {result.skipped}, errors: {result.errors}
        </div>
      )}
    </div>
  )
}
