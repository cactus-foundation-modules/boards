'use client'

import { usePathname } from 'next/navigation'
import { useAdminPath } from '@/components/admin/AdminPathContext'
import { TabStrip } from '@/components/admin/TabStrip'

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
    <TabStrip
      style={{ marginBottom: '1.5rem' }}
      items={tabs.map((tab) => {
        const href = `${base}/${tab.segment}`
        return { key: tab.segment, label: tab.label, href, active: !!pathname?.startsWith(href) }
      })}
    />
  )
}
