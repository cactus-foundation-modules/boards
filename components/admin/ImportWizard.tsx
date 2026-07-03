'use client'

import { useState } from 'react'

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
    <div className="card" style={{ padding: '1.25rem', maxWidth: 640 }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
        Import an existing forum from phpBB (XML export) or Discourse (JSON export). Re-running an
        import is safe - already-imported threads and posts are skipped, never duplicated.
      </p>

      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <label><input type="radio" checked={type === 'phpbb'} onChange={() => setType('phpbb')} /> phpBB (XML)</label>
        <label><input type="radio" checked={type === 'discourse'} onChange={() => setType('discourse')} /> Discourse (JSON)</label>
      </div>

      <input type="file" accept={type === 'phpbb' ? '.xml' : '.json'} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-secondary btn-sm" disabled={!file || busy} onClick={() => run(true)}>Preview (dry run)</button>
        <button className="btn btn-primary btn-sm" disabled={!file || busy} onClick={() => run(false)}>Import</button>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', marginTop: '1rem' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: '1rem', fontSize: 'var(--text-sm)' }}>
          <p>Boards: {result.boardsImported}, Threads: {result.threadsImported}, Posts: {result.postsImported}, Skipped: {result.skipped}, Errors: {result.errors}</p>
        </div>
      )}
    </div>
  )
}
