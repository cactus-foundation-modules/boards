import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const bookmarks = await prisma.$queryRaw`
    SELECT b."created_at", t.* FROM "brd_bookmarks" b
    JOIN "brd_threads" t ON t."id" = b."thread_id"
    WHERE b."user_id" = ${user.id}
    ORDER BY b."created_at" DESC
  `
  return NextResponse.json({ bookmarks })
}
