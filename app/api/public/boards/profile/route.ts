import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { errorResponse } from '@/lib/utils'
import { prisma } from '@/lib/db/prisma'
import { ensureUserProfile } from '@/modules/boards/lib/db'
import { ensureUniqueUsername, slugifyTitle } from '@/modules/boards/lib/slug'
import { getBoardsSettings } from '@/modules/boards/lib/settings'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const profile = await ensureUserProfile(user.id, user.displayName ?? user.username)
  const [prefs] = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_notification_prefs" WHERE "user_id" = ${user.id} LIMIT 1
  `
  return NextResponse.json({ profile, prefs: prefs ?? { mode: 'IMMEDIATE', email_enabled: true } })
}

const PatchBody = z.object({
  username: z.string().min(2).max(32).optional(),
  bio: z.string().max(2000).nullable().optional(),
  signature: z.string().nullable().optional(),
  avatarId: z.string().nullable().optional(),
  notificationMode: z.enum(['IMMEDIATE', 'DIGEST', 'OFF']).optional(),
  emailEnabled: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)

  const profile = await ensureUserProfile(user.id, user.displayName ?? user.username)
  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')
  const p = parsed.data

  const settings = await getBoardsSettings()
  if (p.signature && p.signature.length > settings.signatureMaxLength) {
    return errorResponse(`Signature must be ${settings.signatureMaxLength} characters or fewer`)
  }

  let username: string | undefined
  if (p.username && p.username !== profile.username) {
    username = await ensureUniqueUsername(slugifyTitle(p.username), user.id)
  }

  await prisma.$executeRaw`
    UPDATE "brd_user_profiles" SET
      "username" = COALESCE(${username}, "username"),
      "bio" = CASE WHEN ${p.bio !== undefined} THEN ${p.bio ?? null} ELSE "bio" END,
      "signature" = CASE WHEN ${p.signature !== undefined} THEN ${p.signature ?? null} ELSE "signature" END,
      "avatar_id" = CASE WHEN ${p.avatarId !== undefined} THEN ${p.avatarId ?? null} ELSE "avatar_id" END,
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "user_id" = ${user.id}
  `

  if (p.notificationMode !== undefined || p.emailEnabled !== undefined) {
    await prisma.$executeRaw`
      INSERT INTO "brd_notification_prefs" ("user_id", "mode", "email_enabled")
      VALUES (${user.id}, ${p.notificationMode ?? 'IMMEDIATE'}, ${p.emailEnabled ?? true})
      ON CONFLICT ("user_id") DO UPDATE SET
        "mode" = COALESCE(${p.notificationMode}, "brd_notification_prefs"."mode"),
        "email_enabled" = COALESCE(${p.emailEnabled}, "brd_notification_prefs"."email_enabled"),
        "updated_at" = CURRENT_TIMESTAMP
    `
  }

  const [updated] = await prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM "brd_user_profiles" WHERE "user_id" = ${user.id}`
  return NextResponse.json(updated)
}
