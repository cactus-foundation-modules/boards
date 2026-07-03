'use client'

import { useEffect, useState, useCallback } from 'react'

type QueueItem = { id: string; item_type: string; item_id: string; reason: string; title: string | null; created_at: string }
type Report = { id: string; item_type: string; item_id: string; reason: string; created_at: string }
type Ban = { id: string; user_id: string; username: string; displayName: string | null; reason: string | null; expires_at: string | null }
type IpBan = { id: string; ip_address: string; reason: string | null; expires_at: string | null }
type LogEntry = { id: string; actor_name: string; action: string; item_type: string | null; item_id: string | null; created_at: string }

const SUB_TABS = ['Queue', 'Reports', 'Bans', 'IP Bans', 'Log'] as const
const inputStyle = { padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }

export default function ModerationScreen({ canBan }: { canBan: boolean }) {
  const [tab, setTab] = useState<typeof SUB_TABS[number]>('Queue')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [bans, setBans] = useState<Ban[]>([])
  const [ipBans, setIpBans] = useState<IpBan[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [newBanUserId, setNewBanUserId] = useState('')
  const [newBanReason, setNewBanReason] = useState('')
  const [newIpBan, setNewIpBan] = useState('')
  const [newIpBanReason, setNewIpBanReason] = useState('')

  const load = useCallback(async () => {
    const [q, r, b, ip, l] = await Promise.all([
      fetch('/api/m/boards/admin/moderation/queue').then((r) => r.json()),
      fetch('/api/m/boards/admin/reports').then((r) => r.json()),
      canBan ? fetch('/api/m/boards/admin/bans').then((r) => r.json()) : Promise.resolve({ bans: [] }),
      canBan ? fetch('/api/m/boards/admin/ip-bans').then((r) => r.json()) : Promise.resolve({ ipBans: [] }),
      fetch('/api/m/boards/admin/moderation/log').then((r) => r.json()),
    ])
    setQueue(q.items ?? [])
    setReports(r.reports ?? [])
    setBans(b.bans ?? [])
    setIpBans(ip.ipBans ?? [])
    setLog(l.log ?? [])
  }, [canBan])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- delegating to async helper; all setState calls are after awaits
    load()
  }, [load])

  async function resolveQueue(id: string, action: 'approve' | 'reject') {
    await fetch(`/api/m/boards/admin/moderation/queue/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    load()
  }
  async function resolveReport(id: string, action: 'resolve' | 'dismiss') {
    await fetch(`/api/m/boards/admin/reports/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    load()
  }
  async function addBan() {
    if (!newBanUserId) return
    await fetch('/api/m/boards/admin/bans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: newBanUserId, reason: newBanReason || undefined }) })
    setNewBanUserId(''); setNewBanReason('')
    load()
  }
  async function liftBan(id: string) {
    await fetch(`/api/m/boards/admin/bans/${id}`, { method: 'DELETE' })
    load()
  }
  async function addIpBan() {
    if (!newIpBan) return
    await fetch('/api/m/boards/admin/ip-bans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ipAddress: newIpBan, reason: newIpBanReason || undefined }) })
    setNewIpBan(''); setNewIpBanReason('')
    load()
  }
  async function liftIpBan(id: string) {
    await fetch(`/api/m/boards/admin/ip-bans/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {SUB_TABS.filter((t) => canBan || (t !== 'Bans' && t !== 'IP Bans')).map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Queue' && (
        <table className="table">
          <thead><tr><th>Type</th><th>Title</th><th>Reason</th><th></th></tr></thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.id}>
                <td>{q.item_type}</td><td>{q.title ?? q.item_id}</td><td>{q.reason}</td>
                <td style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => resolveQueue(q.id, 'approve')}>Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => resolveQueue(q.id, 'reject')}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Reports' && (
        <table className="table">
          <thead><tr><th>Type</th><th>Item</th><th>Reason</th><th></th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.item_type}</td><td>{r.item_id}</td><td>{r.reason}</td>
                <td style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => resolveReport(r.id, 'resolve')}>Resolve</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r.id, 'dismiss')}>Dismiss</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Bans' && canBan && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input style={inputStyle} placeholder="User ID" value={newBanUserId} onChange={(e) => setNewBanUserId(e.target.value)} />
            <input style={inputStyle} placeholder="Reason (optional)" value={newBanReason} onChange={(e) => setNewBanReason(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={addBan}>Ban</button>
          </div>
          <table className="table">
            <thead><tr><th>User</th><th>Reason</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {bans.map((b) => (
                <tr key={b.id}>
                  <td>{b.displayName ?? b.username}</td><td>{b.reason ?? '-'}</td><td>{b.expires_at ?? 'Indefinite'}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => liftBan(b.id)}>Lift ban</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'IP Bans' && canBan && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input style={inputStyle} placeholder="IP address" value={newIpBan} onChange={(e) => setNewIpBan(e.target.value)} />
            <input style={inputStyle} placeholder="Reason (optional)" value={newIpBanReason} onChange={(e) => setNewIpBanReason(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={addIpBan}>Ban IP</button>
          </div>
          <table className="table">
            <thead><tr><th>IP</th><th>Reason</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {ipBans.map((b) => (
                <tr key={b.id}>
                  <td>{b.ip_address}</td><td>{b.reason ?? '-'}</td><td>{b.expires_at ?? 'Indefinite'}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => liftIpBan(b.id)}>Lift ban</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Log' && (
        <table className="table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Item</th></tr></thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.actor_name}</td>
                <td>{l.action}</td>
                <td>{l.item_type ? `${l.item_type} ${l.item_id}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
