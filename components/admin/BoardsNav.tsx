'use client'

import { usePathname } from 'next/navigation'
import { useAdminPath } from '@/components/admin/AdminPathContext'
import { TabStrip } from '@/components/admin/TabStrip'

const TABS = [
  { label: 'Threads', segment: 'threads', manageOnly: false },
  { label: 'Structure', segment: 'structure', manageOnly: true },
  { label: 'Moderation', segment: 'moderation', manageOnly: false },
  { label: 'Analytics', segment: 'analytics', manageOnly: false },
]

type Props = { canManage: boolean }

export default function BoardsNav({ canManage }: Props) {
  const pathname = usePathname()
  const adminPath = useAdminPath()
  const base = `/${adminPath}/m/boards`

  const tabs = TABS.filter((t) => !t.manageOnly || canManage)

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
