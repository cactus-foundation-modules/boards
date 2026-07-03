import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission, isAdmin } from '@/lib/permissions/check'
import { getBoardsAccess, isAnyModerator } from '@/modules/boards/lib/permissions'
import BoardsNav from '@/modules/boards/components/admin/BoardsNav'
import ThreadsScreen from '@/modules/boards/components/admin/ThreadsScreen'

export const metadata = { title: 'Boards Threads — Admin' }

export default async function BoardsThreadsPage() {
  const user = await getSessionFromCookie()
  if (!user) return null
  const access = await getBoardsAccess(user)
  if (!isAnyModerator(access)) {
    return <div className="alert alert-danger">You do not have permission to manage Boards.</div>
  }
  const canManage = await hasPermission(user, 'boards.manage')

  return (
    <div>
      <BoardsNav canManage={canManage} isAdmin={isAdmin(user)} />
      <div className="page-header">
        <h1 className="page-title">Threads</h1>
      </div>
      <ThreadsScreen />
    </div>
  )
}
