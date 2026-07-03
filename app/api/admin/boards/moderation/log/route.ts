import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess, isAnyModerator } from '@/modules/boards/lib/permissions'

export async function GET(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  const access = await getBoardsAccess(user)
  if (!isAnyModerator(access)) return errorResponse('Forbidden', 403)

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10))
  const perPage = 50

  const log = await prisma.$queryRaw`
    SELECT * FROM "brd_moderation_log" ORDER BY "created_at" DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `
  return NextResponse.json({ log, page, perPage })
}
