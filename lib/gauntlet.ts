import { prisma } from '@/lib/db/prisma'
import { verifyTurnstile } from '@/lib/auth/turnstile'
import { checkPostCooldown, checkPostsPerHour } from './rate-limit'
import { matchesWordFilter, needsNewAccountModeration } from './moderation'
import type { BoardsSettings } from './types'

export type GauntletContext = {
  userId: string
  accountCreatedAt: Date
  ip: string | null
  turnstileToken?: string
  settings: BoardsSettings
  // board/sub-board is_locked (thread creation) or thread is_locked/ARCHIVED (replies)
  targetLocked: boolean
  minPostLength: number | null
  // combined title + body plain text, used for min-length and word-filter checks
  text: string
  wordFilter: string[] | null
  postCount: number
}

export type GauntletResult =
  | { ok: true; status: 'PUBLISHED' | 'PENDING'; queueReason?: string }
  | { ok: false; error: string; statusCode: number }

// The submission gauntlet, in order (BOARDS_SPEC 5.3), shared by thread
// creation and replies alike.
export async function runSubmissionGauntlet(ctx: GauntletContext): Promise<GauntletResult> {
  // 1. Session (caller's responsibility) + not banned + IP not banned + account age.
  const [userBan] = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "brd_bans" WHERE "user_id" = ${ctx.userId} AND ("expires_at" IS NULL OR "expires_at" > NOW()) LIMIT 1
  `
  if (userBan) return { ok: false, error: 'You are banned from posting.', statusCode: 403 }

  if (ctx.ip) {
    const [ipBan] = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "brd_ip_bans" WHERE "ip_address" = ${ctx.ip} AND ("expires_at" IS NULL OR "expires_at" > NOW()) LIMIT 1
    `
    if (ipBan) return { ok: false, error: 'You are banned from posting.', statusCode: 403 }
  }

  if (ctx.settings.minAccountAgeDays > 0) {
    const ageDays = (Date.now() - ctx.accountCreatedAt.getTime()) / 86_400_000
    if (ageDays < ctx.settings.minAccountAgeDays) {
      return { ok: false, error: 'Your account is too new to post here yet.', statusCode: 403 }
    }
  }

  // 2. Target board/sub-board/thread not locked; thread not archived.
  if (ctx.targetLocked) {
    return { ok: false, error: 'This is locked and not accepting new posts.', statusCode: 403 }
  }

  // 3. Minimum body length.
  if (ctx.minPostLength && ctx.text.trim().length < ctx.minPostLength) {
    return { ok: false, error: `Please write at least ${ctx.minPostLength} characters.`, statusCode: 400 }
  }

  // 4. Turnstile (fail-open when unconfigured).
  const turnstileOk = await verifyTurnstile(ctx.turnstileToken)
  if (!turnstileOk) return { ok: false, error: 'Verification failed - please try again.', statusCode: 403 }

  // 5. Rate limits from settings.
  const cooldownOk = await checkPostCooldown(ctx.userId, ctx.settings.postCooldownSeconds)
  if (!cooldownOk) return { ok: false, error: 'Please wait a moment before posting again.', statusCode: 429 }
  const hourlyOk = await checkPostsPerHour(ctx.userId, ctx.settings.postsPerHourLimit)
  if (!hourlyOk) return { ok: false, error: 'Too many posts - please slow down and try again later.', statusCode: 429 }

  // 6. Moderation gate.
  const wordFilterHit = matchesWordFilter(ctx.text, ctx.wordFilter)
  if (wordFilterHit) return { ok: true, status: 'PENDING', queueReason: `Word filter hit: "${wordFilterHit}"` }

  const newAccountHit = needsNewAccountModeration(
    ctx.postCount,
    ctx.accountCreatedAt,
    ctx.settings.firstPostCount,
    ctx.settings.firstPostAccountAgeDays
  )
  if (newAccountHit) return { ok: true, status: 'PENDING', queueReason: 'New account moderation' }

  return { ok: true, status: 'PUBLISHED' }
}
