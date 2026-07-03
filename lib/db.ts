import { prisma } from '@/lib/db/prisma'
import { slugifyTitle, ensureUniqueUsername } from './slug'
import type { BoardsUserProfile } from './types'

// ---------------------------------------------------------------------------
// User profiles (BOARDS_SPEC 5.4) - created lazily on first Boards interaction
// ---------------------------------------------------------------------------

function mapProfileRow(r: Record<string, unknown>): BoardsUserProfile {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    username: r.username as string,
    signature: (r.signature as string | null) ?? null,
    avatarId: (r.avatar_id as string | null) ?? null,
    bio: (r.bio as string | null) ?? null,
    postCount: r.post_count as number,
    lastSeenAt: (r.last_seen_at as Date | null) ?? null,
    createdAt: r.created_at as Date,
    updatedAt: r.updated_at as Date,
  }
}

export async function getUserProfileByUserId(userId: string): Promise<BoardsUserProfile | null> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_user_profiles" WHERE "user_id" = ${userId} LIMIT 1
  `
  return rows[0] ? mapProfileRow(rows[0]) : null
}

export async function getUserProfileByUsername(username: string): Promise<BoardsUserProfile | null> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_user_profiles" WHERE "username" = ${username} LIMIT 1
  `
  return rows[0] ? mapProfileRow(rows[0]) : null
}

// Creates the profile row on first interaction (posting, subscribing, etc);
// username defaults from the core display name, slugified and deduplicated.
export async function ensureUserProfile(userId: string, displayNameOrUsername: string): Promise<BoardsUserProfile> {
  const existing = await getUserProfileByUserId(userId)
  if (existing) return existing

  const base = slugifyTitle(displayNameOrUsername) || 'member'
  const username = await ensureUniqueUsername(base)

  await prisma.$executeRaw`
    INSERT INTO "brd_user_profiles" ("user_id", "username") VALUES (${userId}, ${username})
    ON CONFLICT ("user_id") DO NOTHING
  `
  const created = await getUserProfileByUserId(userId)
  return created!
}

export async function touchLastSeen(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "brd_user_profiles" SET "last_seen_at" = CURRENT_TIMESTAMP WHERE "user_id" = ${userId}
  `
}

export async function incrementUserPostCount(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "brd_user_profiles" SET "post_count" = "post_count" + 1 WHERE "user_id" = ${userId}
  `
}

// ---------------------------------------------------------------------------
// Thread denormalised counters
// ---------------------------------------------------------------------------

// Set on post creation only - editing a post never bumps a thread, and
// deletions leave last_post_at unchanged (BOARDS_SPEC 3).
export async function bumpThreadOnNewPost(threadId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "brd_threads"
    SET "reply_count" = "reply_count" + 1, "last_post_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${threadId}
  `
}

// Recomputes reply_count/last_post_at from brd_posts - used after thread
// splitting and bulk moderation actions where naive increment/decrement drift.
export async function recomputeThreadCounts(threadId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "brd_threads" t
    SET
      "reply_count" = (SELECT COUNT(*) FROM "brd_posts" p WHERE p."thread_id" = t."id" AND p."status" != 'DELETED'),
      "last_post_at" = (SELECT MAX(p."created_at") FROM "brd_posts" p WHERE p."thread_id" = t."id" AND p."status" != 'DELETED')
    WHERE t."id" = ${threadId}
  `
}

// ---------------------------------------------------------------------------
// Lookups shared across admin + public routes
// ---------------------------------------------------------------------------

export async function getBoardBySlug(slug: string) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_boards" WHERE "slug" = ${slug} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getBoardById(id: string) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_boards" WHERE "id" = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getSubBoardBySlug(boardId: string, slug: string) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_sub_boards" WHERE "board_id" = ${boardId} AND "slug" = ${slug} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getSubBoardById(id: string) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_sub_boards" WHERE "id" = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getThreadBySlug(slug: string) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_threads" WHERE "slug" = ${slug} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getThreadById(id: string) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_threads" WHERE "id" = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

export async function getPostById(id: string) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_posts" WHERE "id" = ${id} LIMIT 1
  `
  return rows[0] ?? null
}
