import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'

const Body = z.object({ ids: z.array(z.string()).min(1) })

export async function PATCH(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.$executeRaw`UPDATE "brd_boards" SET "position" = ${index} WHERE "id" = ${id}`
    )
  )
  return NextResponse.json({ ok: true })
}
