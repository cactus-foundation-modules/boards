import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { isAdmin } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

// Assignment is core-admin only (BOARDS_SPEC 5.5), mirroring Gazette's roles screen.
export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!isAdmin(user)) return errorResponse('Forbidden', 403)

  const assignments = await prisma.$queryRaw`
    SELECT a.*, u."username", u."displayName", b."title" AS board_title
    FROM "brd_moderator_assignments" a
    JOIN "User" u ON u."id" = a."user_id"
    LEFT JOIN "brd_boards" b ON b."id" = a."board_id"
    ORDER BY a."created_at" DESC
  `
  return NextResponse.json({ assignments })
}
