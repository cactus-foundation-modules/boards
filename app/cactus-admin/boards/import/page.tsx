import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission, isAdmin } from '@/lib/permissions/check'
import BoardsNav from '@/modules/boards/components/admin/BoardsNav'
import ImportWizard from '@/modules/boards/components/admin/ImportWizard'

export const metadata = { title: 'Boards Import — Admin' }

export default async function BoardsImportPage() {
  const user = await getSessionFromCookie()
  if (!user) return null
  const canManage = await hasPermission(user, 'boards.manage')
  if (!canManage) {
    return <div className="alert alert-danger">You do not have permission to import into Boards.</div>
  }

  return (
    <div>
      <BoardsNav canManage={canManage} isAdmin={isAdmin(user)} />
      <div className="page-header">
        <h1 className="page-title">Import</h1>
      </div>
      <ImportWizard />
    </div>
  )
}
