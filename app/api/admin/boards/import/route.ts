import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { parsePhpBbXml } from '@/modules/boards/lib/import/phpbb'
import { parseDiscourseJson } from '@/modules/boards/lib/import/discourse'
import { runBoardsImport } from '@/modules/boards/lib/import/run'

// No maxDuration here on purpose. Module routes are reached through the core
// dispatcher (app/api/m/[module]/[...path]/route.ts), and Next only reads the
// setting off the route file it actually compiles - which is the dispatcher's,
// fixed at 60s. An export here read as though it set the ceiling for this import
// while doing nothing at all, so raising it for a big archive would have failed
// silently. Long imports have to be broken up, not given a bigger number.

async function readFileText(file: File): Promise<string> {
  return Buffer.from(await file.arrayBuffer()).toString('utf-8')
}

export async function POST(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const formData = await request.formData()
  const type = formData.get('type')
  const dryRun = formData.get('dryRun') === 'true'
  const files = formData.getAll('files').filter((f): f is File => f instanceof File)

  if (type !== 'phpbb' && type !== 'discourse') return errorResponse('Unknown import type')
  const file = files[0]
  if (!file) return errorResponse('Upload an export file')

  const content = await readFileText(file)
  const boards = type === 'phpbb' ? parsePhpBbXml(content) : parseDiscourseJson(content)

  const [job] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "brd_import_jobs" ("source", "status", "created_by")
    VALUES (${type.toUpperCase()}, 'RUNNING', ${user.id})
    RETURNING "id"
  `
  const jobId = job!.id

  try {
    const stats = await runBoardsImport(boards, dryRun)
    await prisma.$executeRaw`
      UPDATE "brd_import_jobs" SET "status" = 'DONE', "stats" = ${JSON.stringify(stats)}::jsonb, "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${jobId}
    `
    return NextResponse.json({ jobId, dryRun, ...stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    await prisma.$executeRaw`
      UPDATE "brd_import_jobs" SET "status" = 'FAILED', "error" = ${message}, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${jobId}
    `
    return errorResponse(message, 500)
  }
}
