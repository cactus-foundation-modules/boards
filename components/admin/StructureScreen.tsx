'use client'

import { useEffect, useState, useCallback } from 'react'
import { TabStrip } from '@/components/admin/TabStrip'

type Category = { id: string; title: string; position: number }
type Board = { id: string; title: string; slug: string; category_id: string | null; visibility: string; is_locked: boolean; noindex: boolean }
type SubBoard = { id: string; title: string; slug: string; board_id: string; is_locked: boolean }
type Tag = { id: string; name: string; slug: string }
type Template = { id: string; title: string }

const SUB_TABS = ['Categories', 'Boards', 'Sub-boards', 'Tags', 'Templates'] as const

const inputStyle = { padding: '0.375rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)' }

export default function StructureScreen() {
  const [tab, setTab] = useState<typeof SUB_TABS[number]>('Boards')
  const [categories, setCategories] = useState<Category[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [subBoards, setSubBoards] = useState<SubBoard[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  const [newCategoryTitle, setNewCategoryTitle] = useState('')
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardCategory, setNewBoardCategory] = useState('')
  const [newSubBoardTitle, setNewSubBoardTitle] = useState('')
  const [newSubBoardParent, setNewSubBoardParent] = useState('')
  const [newTagName, setNewTagName] = useState('')

  const loadAll = useCallback(async () => {
    const [c, b, sb, t, tpl] = await Promise.all([
      fetch('/api/m/boards/admin/categories').then((r) => r.json()),
      fetch('/api/m/boards/admin/boards').then((r) => r.json()),
      fetch('/api/m/boards/admin/sub-boards').then((r) => r.json()),
      fetch('/api/m/boards/admin/tags').then((r) => r.json()),
      fetch('/api/m/boards/admin/templates').then((r) => r.json()),
    ])
    setCategories(c.categories ?? [])
    setBoards(b.boards ?? [])
    setSubBoards(sb.subBoards ?? [])
    setTags(t.tags ?? [])
    setTemplates(tpl.templates ?? [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- delegating to async helper; all setState calls are after awaits
    loadAll()
  }, [loadAll])

  async function addCategory() {
    if (!newCategoryTitle) return
    await fetch('/api/m/boards/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newCategoryTitle }) })
    setNewCategoryTitle('')
    loadAll()
  }
  async function renameCategory(id: string, title: string) {
    await fetch(`/api/m/boards/admin/categories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    loadAll()
  }
  async function deleteCategory(id: string) {
    await fetch(`/api/m/boards/admin/categories/${id}`, { method: 'DELETE' })
    loadAll()
  }

  async function addBoard() {
    if (!newBoardTitle) return
    await fetch('/api/m/boards/admin/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newBoardTitle, categoryId: newBoardCategory || null }) })
    setNewBoardTitle('')
    loadAll()
  }
  async function deleteBoard(id: string) {
    const res = await fetch(`/api/m/boards/admin/boards/${id}`, { method: 'DELETE' })
    if (res.status === 409) {
      const data = await res.json()
      if (!confirm(`This board has ${data.threads} thread(s) and ${data.posts} post(s). Delete anyway?`)) return
      await fetch(`/api/m/boards/admin/boards/${id}?confirm=1`, { method: 'DELETE' })
    }
    loadAll()
  }
  async function toggleBoardField(id: string, field: 'isLocked' | 'noindex', value: boolean) {
    await fetch(`/api/m/boards/admin/boards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) })
    loadAll()
  }
  async function setBoardVisibility(id: string, visibility: string) {
    await fetch(`/api/m/boards/admin/boards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibility }) })
    loadAll()
  }
  async function renameBoard(id: string, title: string) {
    await fetch(`/api/m/boards/admin/boards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    loadAll()
  }
  async function setBoardCategory(id: string, categoryId: string) {
    await fetch(`/api/m/boards/admin/boards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: categoryId || null }) })
    loadAll()
  }

  async function addSubBoard() {
    if (!newSubBoardTitle || !newSubBoardParent) return
    await fetch('/api/m/boards/admin/sub-boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newSubBoardTitle, boardId: newSubBoardParent }) })
    setNewSubBoardTitle('')
    loadAll()
  }
  async function renameSubBoard(id: string, title: string) {
    await fetch(`/api/m/boards/admin/sub-boards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    loadAll()
  }
  async function setSubBoardParent(id: string, boardId: string) {
    await fetch(`/api/m/boards/admin/sub-boards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boardId }) })
    loadAll()
  }
  async function deleteSubBoard(id: string) {
    await fetch(`/api/m/boards/admin/sub-boards/${id}`, { method: 'DELETE' })
    loadAll()
  }

  async function addTag() {
    if (!newTagName) return
    await fetch('/api/m/boards/admin/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newTagName }) })
    setNewTagName('')
    loadAll()
  }
  async function renameTag(id: string, name: string) {
    await fetch(`/api/m/boards/admin/tags/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    loadAll()
  }
  async function deleteTag(id: string) {
    const res = await fetch(`/api/m/boards/admin/tags/${id}`, { method: 'DELETE' })
    if (res.status === 409) { alert('This tag is still in use on one or more threads.'); return }
    loadAll()
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/m/boards/admin/templates/${id}`, { method: 'DELETE' })
    loadAll()
  }

  return (
    <div>
      <TabStrip
        items={SUB_TABS.map((t) => ({ key: t, label: t, active: tab === t, onClick: () => setTab(t) }))}
      />

      {tab === 'Categories' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input style={inputStyle} placeholder="New category title" value={newCategoryTitle} onChange={(e) => setNewCategoryTitle(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={addCategory}>Add</button>
          </div>
          <table className="table">
            <thead><tr><th>Title</th><th></th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      style={inputStyle}
                      defaultValue={c.title}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.title) renameCategory(c.id, v) }}
                    />
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => deleteCategory(c.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Boards' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input style={inputStyle} placeholder="New board title" value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} />
            <select style={inputStyle} value={newBoardCategory} onChange={(e) => setNewBoardCategory(e.target.value)}>
              <option value="">Uncategorised</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={addBoard}>Add</button>
          </div>
          <table className="table">
            <thead><tr><th>Title</th><th>Category</th><th>Visibility</th><th>Locked</th><th>Hide from search</th><th></th></tr></thead>
            <tbody>
              {boards.map((b) => (
                <tr key={b.id}>
                  <td>
                    <input
                      style={inputStyle}
                      defaultValue={b.title}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== b.title) renameBoard(b.id, v) }}
                    />
                  </td>
                  <td>
                    <select style={inputStyle} value={b.category_id ?? ''} onChange={(e) => setBoardCategory(b.id, e.target.value)}>
                      <option value="">Uncategorised</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </td>
                  <td>
                    <select style={inputStyle} value={b.visibility} onChange={(e) => setBoardVisibility(b.id, e.target.value)}>
                      <option value="PUBLIC">Public</option>
                      <option value="MEMBERS">Members</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </td>
                  <td><input type="checkbox" checked={b.is_locked} onChange={(e) => toggleBoardField(b.id, 'isLocked', e.target.checked)} /></td>
                  <td><input type="checkbox" checked={b.noindex} onChange={(e) => toggleBoardField(b.id, 'noindex', e.target.checked)} /></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => deleteBoard(b.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Sub-boards' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <select style={inputStyle} value={newSubBoardParent} onChange={(e) => setNewSubBoardParent(e.target.value)}>
              <option value="">Choose a board…</option>
              {boards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <input style={inputStyle} placeholder="New sub-board title" value={newSubBoardTitle} onChange={(e) => setNewSubBoardTitle(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={addSubBoard}>Add</button>
          </div>
          <table className="table">
            <thead><tr><th>Title</th><th>Parent board</th><th></th></tr></thead>
            <tbody>
              {subBoards.map((sb) => (
                <tr key={sb.id}>
                  <td>
                    <input
                      style={inputStyle}
                      defaultValue={sb.title}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== sb.title) renameSubBoard(sb.id, v) }}
                    />
                  </td>
                  <td>
                    <select style={inputStyle} value={sb.board_id} onChange={(e) => setSubBoardParent(sb.id, e.target.value)}>
                      {boards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => deleteSubBoard(sb.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Tags' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input style={inputStyle} placeholder="New tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={addTag}>Add</button>
          </div>
          <table className="table">
            <thead><tr><th>Name</th><th></th></tr></thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.id}>
                  <td>
                    <input
                      style={inputStyle}
                      defaultValue={t.name}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.name) renameTag(t.id, v) }}
                    />
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => deleteTag(t.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Templates' && (
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Thread templates are saved from the public new-thread composer and offered there as a starting point.</p>
          <table className="table">
            <thead><tr><th>Title</th><th></th></tr></thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}><td>{t.title}</td><td><button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(t.id)}>Delete</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
