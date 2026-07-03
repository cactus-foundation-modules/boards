'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminPath } from '@/components/admin/AdminPathContext'

const TABS = [
  { label: 'Threads', segment: 'threads', manageOnly: false, adminOnly: false },
  { label: 'Structure', segment: 'structure', manageOnly: true, adminOnly: false },
  { label: 'Moderation', segment: 'moderation', manageOnly: false, adminOnly: false },
  { label: 'Moderators', segment: 'moderators', manageOnly: false, adminOnly: true },
  { label: 'Analytics', segment: 'analytics', manageOnly: false, adminOnly: false },
  { label: 'Import', segment: 'import', manageOnly: true, adminOnly: false },
  { label: 'Settings', segment: 'settings', manageOnly: true, adminOnly: false },
]

type Props = { canManage: boolean; isAdmin: boolean }

export default function BoardsNav({ canManage, isAdmin }: Props) {
  const pathname = usePathname()
  const adminPath = useAdminPath()
  const base = `/${adminPath}/m/boards`

  const tabs = TABS.filter((t) => (!t.manageOnly || canManage) && (!t.adminOnly || isAdmin))

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'center', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
      {tabs.map((tab) => {
        const href = `${base}/${tab.segment}`
        const active = pathname?.startsWith(href)
        return (
          <Link
            key={tab.segment}
            href={href}
            prefetch={false}
            style={{
              padding: '0.625rem 1rem', textDecoration: 'none',
              borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: active ? 600 : 400,
              fontSize: 'var(--text-base)', whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
