import { prisma } from '@/lib/db/prisma'
import { generateSlug } from '@/lib/utils'

export function slugifyTitle(title: string): string {
  return generateSlug(title)
}

// Sub-route segments a thread slug must never collide with, since /boards/<slug>
// shares the URL space with /boards/t, /boards/u.
export const RESERVED_BOARD_SLUGS = ['t', 'u']

export async function ensureUniqueThreadSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'thread'
  let suffix = 2
  for (;;) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "brd_threads" WHERE "slug" = ${slug} LIMIT 1
    `
    const clash = rows[0]
    if (!clash || clash.id === excludeId) return slug
    slug = `${base || 'thread'}-${suffix}`
    suffix += 1
  }
}

export async function ensureUniqueBoardSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'board'
  let suffix = 2
  for (;;) {
    if (!RESERVED_BOARD_SLUGS.includes(slug)) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "brd_boards" WHERE "slug" = ${slug} LIMIT 1
      `
      const clash = rows[0]
      if (!clash || clash.id === excludeId) return slug
    }
    slug = `${base || 'board'}-${suffix}`
    suffix += 1
  }
}

export async function ensureUniqueSubBoardSlug(boardId: string, base: string, excludeId?: string): Promise<string> {
  let slug = base || 'sub-board'
  let suffix = 2
  for (;;) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "brd_sub_boards" WHERE "board_id" = ${boardId} AND "slug" = ${slug} LIMIT 1
    `
    const clash = rows[0]
    if (!clash || clash.id === excludeId) return slug
    slug = `${base || 'sub-board'}-${suffix}`
    suffix += 1
  }
}

export async function ensureUniqueTagSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'tag'
  let suffix = 2
  for (;;) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "brd_tags" WHERE "slug" = ${slug} LIMIT 1
    `
    const clash = rows[0]
    if (!clash || clash.id === excludeId) return slug
    slug = `${base || 'tag'}-${suffix}`
    suffix += 1
  }
}

export async function ensureUniqueUsername(base: string, excludeUserId?: string): Promise<string> {
  let username = base || 'member'
  let suffix = 2
  for (;;) {
    const rows = await prisma.$queryRaw<Array<{ user_id: string }>>`
      SELECT "user_id" FROM "brd_user_profiles" WHERE "username" = ${username} LIMIT 1
    `
    const clash = rows[0]
    if (!clash || clash.user_id === excludeUserId) return username
    username = `${base || 'member'}-${suffix}`
    suffix += 1
  }
}
