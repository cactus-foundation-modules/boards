import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { isBoardVisible } from '@/modules/boards/lib/visibility'

type Params = { params: Promise<{ id: string }> }

const Body = z.object({ optionId: z.string() })

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const { id: pollId } = await params
  const [poll] = await prisma.$queryRaw<Array<{ allow_multiple: boolean; closes_at: Date | null; board_id: string }>>`
    SELECT p."allow_multiple", p."closes_at", t."board_id"
    FROM "brd_polls" p JOIN "brd_threads" t ON t."id" = p."thread_id"
    WHERE p."id" = ${pollId} LIMIT 1
  `
  if (!poll) return errorResponse('Poll not found', 404)

  const access = await getBoardsAccess(user)
  if (!(await isBoardVisible(poll.board_id, true, access))) return errorResponse('Poll not found', 404)
  if (poll.closes_at && poll.closes_at.getTime() < Date.now()) return errorResponse('This poll is closed', 403)

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { optionId } = parsed.data

  const [option] = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "brd_poll_options" WHERE "id" = ${optionId} AND "poll_id" = ${pollId} LIMIT 1
  `
  if (!option) return errorResponse('Option not found', 404)

  const existingForOption = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "brd_poll_votes" WHERE "option_id" = ${optionId} AND "user_id" = ${user.id} LIMIT 1
  `

  if (existingForOption[0]) {
    await prisma.$executeRaw`DELETE FROM "brd_poll_votes" WHERE "id" = ${existingForOption[0].id}`
  } else {
    if (!poll.allow_multiple) {
      await prisma.$executeRaw`
        DELETE FROM "brd_poll_votes" WHERE "poll_id" = ${pollId} AND "user_id" = ${user.id}
      `
    }
    await prisma.$executeRaw`
      INSERT INTO "brd_poll_votes" ("option_id", "poll_id", "user_id") VALUES (${optionId}, ${pollId}, ${user.id})
    `
  }

  const options = await prisma.$queryRaw<Array<{ id: string; label: string; vote_count: bigint }>>`
    SELECT o."id", o."label", COUNT(v."id") AS vote_count
    FROM "brd_poll_options" o LEFT JOIN "brd_poll_votes" v ON v."option_id" = o."id"
    WHERE o."poll_id" = ${pollId}
    GROUP BY o."id", o."label", o."position"
    ORDER BY o."position" ASC
  `
  const userVotes = await prisma.$queryRaw<Array<{ option_id: string }>>`
    SELECT "option_id" FROM "brd_poll_votes" WHERE "poll_id" = ${pollId} AND "user_id" = ${user.id}
  `

  return NextResponse.json({
    options: options.map((o) => ({ id: o.id, label: o.label, voteCount: Number(o.vote_count) })),
    userVotedOptionIds: userVotes.map((v) => v.option_id),
  })
}
