import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission, isAdmin } from '@/lib/permissions/check'
import BoardsNav from '@/modules/boards/components/admin/BoardsNav'
import SettingsScreen from '@/modules/boards/components/admin/SettingsScreen'

export const metadata = { title: 'Boards Settings — Admin' }

export default async function BoardsSettingsPage() {
  const user = await getSessionFromCookie()
  if (!user) return null
  const canManage = await hasPermission(user, 'boards.manage')
  if (!canManage) {
    return <div className="alert alert-danger">You do not have permission to manage Boards settings.</div>
  }

  return (
    <div>
      <BoardsNav canManage={canManage} isAdmin={isAdmin(user)} />
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>
      <SettingsScreen />
    </div>
  )
}
