'use client'

import { useEffect, useState, useCallback } from 'react'

type ThreadRow = {
  id: string
  title: string
  status: string
  is_pinned: boolean
  is_locked: boolean
  is_global_announcement: boolean
  reply_count: number
  view_count: number
  board_title: string
  created_at: string
}

const STATUS_OPTIONS = ['', 'PUBLISHED', 'PENDING', 'HIDDEN', 'DELETED', 'ARCHIVED']

export default function ThreadsScreen() {
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sp = new URLSearchParams({ page: String(page) })
    if (status) sp.set('status', status)
    if (q) sp.set('q', q)
    const res = await fetch(`/api/m/boards/admin/threads?${sp}`)
    const data = await res.json()
    setThreads(data.threads ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, status, q])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- delegating to async helper; all setState calls are after awaits
    load()
  }, [load])

  async function action(id: string, path: string, method = 'POST', body?: unknown) {
    await fetch(`/api/m/boards/admin/threads/${id}${path}`, {
      method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    })
    load()
  }

  async function bulkAction(bulkActionName: string) {
    if (selected.size === 0) return
    await fetch('/api/m/boards/admin/threads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action: bulkActionName }),
    })
    setSelected(new Set())
    load()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / 25))

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input placeholder="Search titles…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} style={{ padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} style={{ padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => bulkAction('hide')}>Hide</button>
            <button className="btn btn-secondary btn-sm" onClick={() => bulkAction('lock')}>Lock</button>
            <button className="btn btn-secondary btn-sm" onClick={() => bulkAction('archive')}>Archive</button>
            <button className="btn btn-danger btn-sm" onClick={() => bulkAction('delete')}>Delete</button>
          </div>
        )}
      </div>

      {loading ? <p>Loading…</p> : (
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Board</th>
              <th>Status</th>
              <th>Replies</th>
              <th>Views</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((t) => (
              <tr key={t.id}>
                <td><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                <td>
                  {t.is_pinned && '📌 '}{t.is_global_announcement && '📢 '}{t.title}
                </td>
                <td>{t.board_title}</td>
                <td><span className="badge">{t.status}</span></td>
                <td>{t.reply_count}</td>
                <td>{t.view_count}</td>
                <td style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => action(t.id, '/pin')}>{t.is_pinned ? 'Unpin' : 'Pin'}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => action(t.id, '/lock')}>{t.is_locked ? 'Unlock' : 'Lock'}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => action(t.id, '/archive')}>{t.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => action(t.id, '', 'DELETE')}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} of {totalPages}</span>
        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  )
}
