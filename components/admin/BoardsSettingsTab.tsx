'use client'

import { useEffect, useState } from 'react'
import ImportWizard from './ImportWizard'
import { TabStrip } from '@/components/admin/TabStrip'
import { SettingsHeaderActions, SettingsHeaderStatus } from '@/components/admin/SettingsHeaderActions'

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


export function BoardsSettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [sub, setSub] = useState<'settings' | 'import'>('settings')

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

  if (!settings) return <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>

  return (
    <div>
      <TabStrip
        items={[
          { key: 'settings', label: 'Settings', active: sub === 'settings', onClick: () => setSub('settings') },
          { key: 'import', label: 'Import', active: sub === 'import', onClick: () => setSub('import') },
        ]}
      />

      {sub === 'settings' && (
        <div className="settings-cols">
          <SettingsHeaderActions>
            <SettingsHeaderStatus message={saved ? 'Saved' : null} />
            <button className="btn btn-primary" onClick={save}>Save changes</button>
          </SettingsHeaderActions>
          <div className="card">
            <div className="card-title">Pages and posts</div>
            <div className="field">
              <label htmlFor="boards-threadsPerPage">Threads per page</label>
              <input id="boards-threadsPerPage" type="number" min={0} value={settings.threadsPerPage} onChange={(e) => set('threadsPerPage', Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="boards-postsPerPage">Posts per page</label>
              <input id="boards-postsPerPage" type="number" min={0} value={settings.postsPerPage} onChange={(e) => set('postsPerPage', Number(e.target.value))} />
            </div>
            <div className="field">
              <label className="settings-check">
                <input type="checkbox" checked={settings.showViewCounts} onChange={(e) => set('showViewCounts', e.target.checked)} />
                Show view counts
              </label>
            </div>
            <div className="field">
              <label className="settings-check">
                <input type="checkbox" checked={settings.reactionsEnabled} onChange={(e) => set('reactionsEnabled', e.target.checked)} />
                Allow reactions
              </label>
            </div>
            <div className="field">
              <label className="settings-check">
                <input type="checkbox" checked={settings.signaturesEnabled} onChange={(e) => set('signaturesEnabled', e.target.checked)} />
                Allow signatures
              </label>
            </div>
            <div className="field">
              <label htmlFor="boards-signatureMaxLength">Longest signature (characters)</label>
              <input id="boards-signatureMaxLength" type="number" min={0} value={settings.signatureMaxLength} onChange={(e) => set('signatureMaxLength', Number(e.target.value))} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">RSS</div>
            <div className="field field--beside-input">
              <label className="settings-check">
                <input type="checkbox" checked={settings.rssEnabled} onChange={(e) => set('rssEnabled', e.target.checked)} />
                Publish RSS feeds
              </label>
            </div>
            <div className="field">
              <label htmlFor="boards-feedTitle">Feed title</label>
              <input id="boards-feedTitle" value={settings.feedTitle ?? ''} onChange={(e) => set('feedTitle', e.target.value || null)} />
            </div>
            <div className="field">
              <label htmlFor="boards-feedDescription">Feed description</label>
              <input id="boards-feedDescription" value={settings.feedDescription ?? ''} onChange={(e) => set('feedDescription', e.target.value || null)} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Posting rules</div>
            <div className="field">
              <label htmlFor="boards-minAccountAgeDays">Account must be this old to post (days)</label>
              <input id="boards-minAccountAgeDays" type="number" min={0} value={settings.minAccountAgeDays} onChange={(e) => set('minAccountAgeDays', Number(e.target.value))} />
              <span className="field-hint">0 lets anyone post straight away.</span>
            </div>
            <div className="field">
              <label htmlFor="boards-postCooldownSeconds">Wait between posts (seconds)</label>
              <input id="boards-postCooldownSeconds" type="number" min={0} value={settings.postCooldownSeconds} onChange={(e) => set('postCooldownSeconds', Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="boards-firstPostCount">Hold the first posts for checking</label>
              <input id="boards-firstPostCount" type="number" min={0} value={settings.firstPostCount} onChange={(e) => set('firstPostCount', Number(e.target.value))} />
              <span className="field-hint">How many of a new member’s posts wait for a moderator. 0 to switch off.</span>
            </div>
            <div className="field">
              <label htmlFor="boards-firstPostAccountAgeDays">…for accounts younger than (days)</label>
              <input id="boards-firstPostAccountAgeDays" type="number" min={0} value={settings.firstPostAccountAgeDays} onChange={(e) => set('firstPostAccountAgeDays', Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="boards-postsPerHourLimit">Most posts an hour</label>
              <input id="boards-postsPerHourLimit" type="number" min={0} value={settings.postsPerHourLimit} onChange={(e) => set('postsPerHourLimit', Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="boards-editWindowMinutes">Editing allowed for (minutes)</label>
              <input id="boards-editWindowMinutes" type="number" min={0} value={settings.editWindowMinutes} onChange={(e) => set('editWindowMinutes', Number(e.target.value))} />
              <span className="field-hint">0 lets posts be edited at any time.</span>
            </div>
          </div>
        </div>
      )}

      {sub === 'import' && (
        <div className="settings-cols">
          <ImportWizard />
        </div>
      )}
    </div>
  )
}
