import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ jobId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const { jobId } = await params
  const [job] = await prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM "brd_import_jobs" WHERE "id" = ${jobId}`
  if (!job) return errorResponse('Job not found', 404)
  return NextResponse.json(job)
}
