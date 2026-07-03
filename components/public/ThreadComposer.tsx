'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Puck } from '@puckeditor/core'
import type { Data } from '@puckeditor/core'
import '@puckeditor/core/no-external.css'
import { bodyEditorConfig } from '@/modules/boards/components/puck/body/bodyEditorConfig'

type Tag = { id: string; name: string }
type Template = { id: string; title: string; builder_data: Data | null }

const EMPTY_DATA: Data = { root: { props: {} }, content: [], zones: {} }
const AUTOSAVE_DEBOUNCE_MS = 1500

export default function ThreadComposer({ boardId, boardSlug, subBoardId }: { boardId: string; boardSlug: string; subBoardId?: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [builderData, setBuilderData] = useState<Data>(EMPTY_DATA)
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/m/boards/public/tags').then((r) => r.json()).then((d) => setTags(d.tags ?? []))
    fetch('/api/m/boards/public/templates').then((r) => r.json()).then((d) => setTemplates(d.templates ?? []))
    fetch(`/api/m/boards/public/drafts?boardId=${boardId}`).then((r) => r.json()).then((d) => {
      const draft = d.drafts?.[0]
      if (draft) {
        setDraftId(draft.id)
        setTitle(draft.title ?? '')
        if (draft.opener_data) setBuilderData(draft.opener_data)
      }
    })

  }, [boardId])

  const saveDraft = useCallback((nextTitle: string, nextData: Data) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch('/api/m/boards/public/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draftId ?? undefined, boardId, title: nextTitle, openerData: nextData }),
      })
      const data = await res.json()
      if (data?.id && !draftId) setDraftId(data.id)
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [boardId, draftId])

  function handleTitleChange(value: string) {
    setTitle(value)
    saveDraft(value, builderData)
  }
  function handleBuilderChange(data: Data) {
    setBuilderData(data)
    saveDraft(title, data)
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (template?.builder_data) setBuilderData(template.builder_data)
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  async function submit() {
    if (!title.trim()) { setError('Please give your thread a title.'); return }
    setBusy(true)
    setError(null)

    const poll = pollEnabled && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2
      ? { question: pollQuestion, options: pollOptions.filter((o) => o.trim()), allowMultiple: pollAllowMultiple }
      : undefined

    const res = await fetch('/api/m/boards/public/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, subBoardId, title, openerData: builderData, tagIds: selectedTagIds, poll }),
    })
    const data = await res.json()
    setBusy(false)

    if (!res.ok) { setError(data.error ?? 'Could not create thread'); return }

    if (draftId) await fetch(`/api/m/boards/public/drafts/${draftId}`, { method: 'DELETE' })
    router.push(`/boards/t/${data.slug}`)
  }

  return (
    <div className="brd-thread-composer">
      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Thread title"
        style={{ fontSize: '1.25rem', fontWeight: 600, width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 6, marginBottom: '0.75rem', background: 'var(--color-bg)', color: 'var(--color-text)' }}
      />

      {templates.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <select onChange={(e) => e.target.value && applyTemplate(e.target.value)} defaultValue="" style={{ padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <option value="">Start from a template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
      )}

      <div style={{ minHeight: 300, border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden', marginBottom: '0.75rem' }}>
        <Puck config={bodyEditorConfig as any} data={builderData} onChange={handleBuilderChange} iframe={{ enabled: false }} />
      </div>

      {tags.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: 'var(--text-sm)', marginBottom: '0.375rem' }}>Tags</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tags.map((t) => (
              <label key={t.id} style={{ fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={selectedTagIds.includes(t.id)} onChange={() => toggleTag(t.id)} /> {t.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={pollEnabled} onChange={(e) => setPollEnabled(e.target.checked)} /> Add a poll
        </label>
        {pollEnabled && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 400 }}>
            <input placeholder="Poll question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} style={{ padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => setPollOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                style={{ padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }}
              />
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPollOptions((prev) => [...prev, ''])}>Add option</button>
            <label style={{ fontSize: 'var(--text-sm)' }}><input type="checkbox" checked={pollAllowMultiple} onChange={(e) => setPollAllowMultiple(e.target.checked)} /> Allow selecting multiple options</label>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Posting…' : 'Post thread'}</button>
    </div>
  )
}
