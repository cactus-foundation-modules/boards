import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'

export async function GET(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!access.canModerate) return errorResponse('Forbidden', 403)

  // `|| 1` before the clamp: Math.max(1, NaN) is NaN, not 1 - see the boards
  // search route for the 500 that caused.
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1)
  const perPage = 50

  const log = await prisma.$queryRaw`
    SELECT * FROM "brd_moderation_log" ORDER BY "created_at" DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `
  return NextResponse.json({ log, page, perPage })
}
