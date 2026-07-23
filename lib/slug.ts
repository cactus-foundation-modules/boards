import { prisma } from '@/lib/db/prisma'
import { generateSlug } from '@/lib/utils'

export function slugifyTitle(title: string): string {
  return generateSlug(title)
}

// Route segments a BOARD slug must never collide with, because /boards/<slug> is
// a dynamic segment sharing its URL space with the static ones beside it, and a
// static segment always wins - so a board slugged the same as one of these is
// simply unreachable.
//
// This list must match the static directories sitting next to `[board]` in
// app/public/boards/. If you add a route there, add it here too. Currently:
//   app/public/boards/t/        -> 't'
//   app/public/boards/u/        -> 'u'
//   app/public/boards/tag/      -> 'tag'
//   app/public/boards/feed.xml/ -> 'feed.xml'
// ('tag' and 'feed.xml' were missing, so a board titled "Tag" was shadowed by
// the tag listing and could not be opened. 'feed.xml' cannot currently be
// produced by slugifyTitle, which drops the dot, but it is reserved anyway so
// the list stays a faithful mirror of the routes rather than of today's slugify.)
//
// Thread slugs are deliberately NOT covered: they live under /boards/t/<slug>,
// a prefix no other route shares, so they cannot collide.
export const RESERVED_BOARD_SLUGS = ['t', 'u', 'tag', 'feed.xml']

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
