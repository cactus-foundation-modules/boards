import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission, isAdmin } from '@/lib/permissions/check'
import BoardsNav from '@/modules/boards/components/admin/BoardsNav'
import ModeratorsScreen from '@/modules/boards/components/admin/ModeratorsScreen'

export const metadata = { title: 'Boards Moderators — Admin' }

export default async function BoardsModeratorsPage() {
  const user = await getSessionFromCookie()
  if (!user) return null
  if (!isAdmin(user)) {
    return <div className="alert alert-danger">You do not have permission to assign Boards moderators.</div>
  }
  const canManage = await hasPermission(user, 'boards.manage')

  return (
    <div>
      <BoardsNav canManage={canManage} isAdmin={isAdmin(user)} />
      <div className="page-header">
        <h1 className="page-title">Moderators</h1>
      </div>
      <ModeratorsScreen />
    </div>
  )
}
