import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission, isAdmin } from '@/lib/permissions/check'
import { getBoardsAccess, isAnyModerator, isGlobalModeratorOrAdmin } from '@/modules/boards/lib/permissions'
import BoardsNav from '@/modules/boards/components/admin/BoardsNav'
import ModerationScreen from '@/modules/boards/components/admin/ModerationScreen'

export const metadata = { title: 'Boards Moderation — Admin' }

export default async function BoardsModerationPage() {
  const user = await getSessionFromCookie()
  if (!user) return null
  const access = await getBoardsAccess(user)
  if (!isAnyModerator(access)) {
    return <div className="alert alert-danger">You do not have permission to moderate Boards.</div>
  }
  const canManage = await hasPermission(user, 'boards.manage')

  return (
    <div>
      <BoardsNav canManage={canManage} isAdmin={isAdmin(user)} />
      <div className="page-header">
        <h1 className="page-title">Moderation</h1>
      </div>
      <ModerationScreen canBan={isGlobalModeratorOrAdmin(access)} />
    </div>
  )
}
