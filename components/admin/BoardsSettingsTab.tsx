'use client'

import { useEffect, useState } from 'react'
import ImportWizard from './ImportWizard'

type Settings = {
  threadsPerPage: number
  postsPerPage: number
  rssEnabled: boolean
  feedTitle: string | null
  feedDescription: string | null
  reactionsEnabled: boolean
  signaturesEnabled: boolean
  signatureMaxLength: number
  minAccountAgeDays: number
  firstPostCount: number
  firstPostAccountAgeDays: number
  postCooldownSeconds: number
  postsPerHourLimit: number
  editWindowMinutes: number
  showViewCounts: boolean
}

const inputStyle = { padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)', width: '100%', maxWidth: 200 }
const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border)' }

export function BoardsSettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/m/boards/admin/settings').then((r) => r.json()).then(setSettings)
  }, [])

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function save() {
    if (!settings) return
    await fetch('/api/m/boards/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return <p>Loading…</p>

  return (
    <div>
      <div className="card" style={{ padding: '1.25rem', maxWidth: 640 }}>
        <div style={rowStyle}><label>Threads per page</label><input type="number" style={inputStyle} value={settings.threadsPerPage} onChange={(e) => set('threadsPerPage', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>Posts per page</label><input type="number" style={inputStyle} value={settings.postsPerPage} onChange={(e) => set('postsPerPage', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>RSS feeds enabled</label><input type="checkbox" checked={settings.rssEnabled} onChange={(e) => set('rssEnabled', e.target.checked)} /></div>
        <div style={rowStyle}><label>Feed title</label><input style={inputStyle} value={settings.feedTitle ?? ''} onChange={(e) => set('feedTitle', e.target.value || null)} /></div>
        <div style={rowStyle}><label>Feed description</label><input style={inputStyle} value={settings.feedDescription ?? ''} onChange={(e) => set('feedDescription', e.target.value || null)} /></div>
        <div style={rowStyle}><label>Reactions enabled</label><input type="checkbox" checked={settings.reactionsEnabled} onChange={(e) => set('reactionsEnabled', e.target.checked)} /></div>
        <div style={rowStyle}><label>Signatures enabled</label><input type="checkbox" checked={settings.signaturesEnabled} onChange={(e) => set('signaturesEnabled', e.target.checked)} /></div>
        <div style={rowStyle}><label>Signature max length</label><input type="number" style={inputStyle} value={settings.signatureMaxLength} onChange={(e) => set('signatureMaxLength', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>Minimum account age to post (days, 0 = off)</label><input type="number" style={inputStyle} value={settings.minAccountAgeDays} onChange={(e) => set('minAccountAgeDays', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>First-post moderation threshold (0 = off)</label><input type="number" style={inputStyle} value={settings.firstPostCount} onChange={(e) => set('firstPostCount', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>First-post account age window (days)</label><input type="number" style={inputStyle} value={settings.firstPostAccountAgeDays} onChange={(e) => set('firstPostAccountAgeDays', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>Post cooldown (seconds)</label><input type="number" style={inputStyle} value={settings.postCooldownSeconds} onChange={(e) => set('postCooldownSeconds', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>Posts per hour limit</label><input type="number" style={inputStyle} value={settings.postsPerHourLimit} onChange={(e) => set('postsPerHourLimit', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>Edit window (minutes, 0 = unlimited)</label><input type="number" style={inputStyle} value={settings.editWindowMinutes} onChange={(e) => set('editWindowMinutes', Number(e.target.value))} /></div>
        <div style={rowStyle}><label>Show view counts</label><input type="checkbox" checked={settings.showViewCounts} onChange={(e) => set('showViewCounts', e.target.checked)} /></div>

        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary btn-sm" onClick={save}>Save settings</button>
          {saved && <span style={{ marginLeft: '0.75rem', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>Saved</span>}
        </div>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)', maxWidth: 720 }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem' }}>Import</h3>
        <ImportWizard />
      </div>
    </div>
  )
}
