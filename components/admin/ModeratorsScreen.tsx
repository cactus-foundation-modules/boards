'use client'

import { useEffect, useState, useCallback } from 'react'

type Assignment = { id: string; user_id: string; board_id: string | null; username: string; displayName: string | null; board_title: string | null }
type Board = { id: string; title: string }
type UserOption = { id: string; username: string; displayName: string | null }

const inputStyle = { padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }

export default function ModeratorsScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [q, setQ] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedBoardId, setSelectedBoardId] = useState('')

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch('/api/m/boards/admin/moderators').then((r) => r.json()),
      fetch('/api/m/boards/admin/boards').then((r) => r.json()),
    ])
    setAssignments(a.assignments ?? [])
    setBoards(b.boards ?? [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- delegating to async helper; all setState calls are after awaits
    load()
  }, [load])

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/m/boards/admin/users?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setUsers(data.users ?? [])
    }, 250)
    return () => clearTimeout(timeout)
  }, [q])

  async function assign() {
    if (!selectedUserId) return
    await fetch(`/api/m/boards/admin/moderators/${selectedUserId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: selectedBoardId || null }),
    })
    setSelectedUserId('')
    setSelectedBoardId('')
    load()
  }

  async function remove(a: Assignment) {
    const sp = a.board_id ? `?boardId=${a.board_id}` : ''
    await fetch(`/api/m/boards/admin/moderators/${a.user_id}${sp}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem' }}>Assign a moderator</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input style={inputStyle} placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select style={inputStyle} value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">Choose a user…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.displayName ?? u.username}</option>)}
          </select>
          <select style={inputStyle} value={selectedBoardId} onChange={(e) => setSelectedBoardId(e.target.value)}>
            <option value="">Global Moderator (all boards)</option>
            {boards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={assign}>Assign</button>
        </div>
      </div>

      <table className="table">
        <thead><tr><th>User</th><th>Scope</th><th></th></tr></thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id}>
              <td>{a.displayName ?? a.username}</td>
              <td>{a.board_id ? a.board_title : <strong>Global Moderator</strong>}</td>
              <td><button className="btn btn-danger btn-sm" onClick={() => remove(a)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
