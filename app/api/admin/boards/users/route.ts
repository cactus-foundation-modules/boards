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

  const q = request.nextUrl.searchParams.get('q') ?? undefined
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
      : undefined,
    select: { id: true, username: true, displayName: true, email: true },
    take: 25,
    orderBy: { username: 'asc' },
  })
  return NextResponse.json({ users })
}
