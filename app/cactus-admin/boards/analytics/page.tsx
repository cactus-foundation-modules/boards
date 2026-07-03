import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission, isAdmin } from '@/lib/permissions/check'
import BoardsNav from '@/modules/boards/components/admin/BoardsNav'
import AnalyticsScreen from '@/modules/boards/components/admin/AnalyticsScreen'

export const metadata = { title: 'Boards Analytics — Admin' }

export default async function BoardsAnalyticsPage() {
  const user = await getSessionFromCookie()
  if (!user) return null
  const canView = await hasPermission(user, 'boards.access')
  if (!canView) {
    return <div className="alert alert-danger">You do not have permission to view Boards analytics.</div>
  }
  const canManage = await hasPermission(user, 'boards.manage')

  return (
    <div>
      <BoardsNav canManage={canManage} isAdmin={isAdmin(user)} />
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
      </div>
      <AnalyticsScreen />
    </div>
  )
}
