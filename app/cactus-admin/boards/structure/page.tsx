import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission, isAdmin } from '@/lib/permissions/check'
import BoardsNav from '@/modules/boards/components/admin/BoardsNav'
import StructureScreen from '@/modules/boards/components/admin/StructureScreen'

export const metadata = { title: 'Boards Structure — Admin' }

export default async function BoardsStructurePage() {
  const user = await getSessionFromCookie()
  if (!user) return null
  const canManage = await hasPermission(user, 'boards.manage')
  if (!canManage) {
    return <div className="alert alert-danger">You do not have permission to manage Boards structure.</div>
  }

  return (
    <div>
      <BoardsNav canManage={canManage} isAdmin={isAdmin(user)} />
      <div className="page-header">
        <h1 className="page-title">Structure</h1>
      </div>
      <StructureScreen />
    </div>
  )
}
