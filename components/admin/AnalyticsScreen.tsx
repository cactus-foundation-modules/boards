'use client'

import { useEffect, useState } from 'react'

type Analytics = {
  totals: { threads: number; posts: number; members: number; views: number }
  activity: Array<{ day: string; threads: number; posts: number }>
  topBoards: Array<{ title: string; threadCount: number; postCount: number }>
  openQueueCount: number
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<Analytics | null>(null)

  useEffect(() => {
    fetch('/api/m/boards/admin/analytics').then((r) => r.json()).then(setData)
  }, [])

  if (!data) return <p>Loading…</p>

  const maxDaily = Math.max(1, ...data.activity.map((a) => a.threads + a.posts))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Threads', value: data.totals.threads },
          { label: 'Posts', value: data.totals.posts },
          { label: 'Members', value: data.totals.members },
          { label: 'Views', value: data.totals.views },
          { label: 'Open queue', value: data.openQueueCount },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Activity, last 30 days</h3>
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 120 }}>
          {data.activity.map((a) => (
            <div
              key={a.day}
              title={`${new Date(a.day).toLocaleDateString()}: ${a.threads} threads, ${a.posts} posts`}
              style={{ flex: 1, background: 'var(--color-primary)', height: `${((a.threads + a.posts) / maxDaily) * 100}%`, minHeight: 2, borderRadius: 2 }}
            />
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Top boards</h3>
        <table className="table">
          <thead><tr><th>Board</th><th>Threads</th><th>Posts</th></tr></thead>
          <tbody>
            {data.topBoards.map((b) => (
              <tr key={b.title}><td>{b.title}</td><td>{b.threadCount}</td><td>{b.postCount}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
