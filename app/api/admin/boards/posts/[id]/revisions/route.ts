import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  const { id } = await params
  const revisions = await prisma.$queryRaw`
    SELECT * FROM "brd_post_revisions" WHERE "post_id" = ${id} ORDER BY "created_at" DESC
  `
  return NextResponse.json({ revisions })
}
