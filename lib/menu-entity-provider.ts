import { prisma } from '@/lib/db/prisma'
import type { MenuEntityKind, MenuEntitySearchResult, MenuEntityProvider, ResolvedMenuEntity } from '@/lib/modules/menu-entity-provider'

// Contributes to the "core.menu-entity-provider" extension point so the admin
// menu builder can link to Boards content (BOARDS_SPEC menu-linking amendment).
const KINDS: MenuEntityKind[] = [
  { id: 'home', label: 'Boards home page' },
  { id: 'category', label: 'Board category' },
  { id: 'board', label: 'Board' },
  { id: 'sub-board', label: 'Sub-board' },
  { id: 'tag', label: 'Tag' },
]

function listKinds(): MenuEntityKind[] {
  return KINDS
}

async function searchEntities(kind: string, query: string): Promise<MenuEntitySearchResult[]> {
  const q = `%${query}%`
  if (kind === 'home') {
    return [{ id: 'home', label: 'Boards home page' }]
  }
  if (kind === 'category') {
    const rows = await prisma.$queryRaw<Array<{ id: string; title: string }>>`
      SELECT "id", "title" FROM "brd_categories" WHERE "title" ILIKE ${q} ORDER BY "position" ASC LIMIT 20
    `
    return rows.map((r) => ({ id: r.id, label: r.title }))
  }
  if (kind === 'board') {
    const rows = await prisma.$queryRaw<Array<{ id: string; title: string; category_title: string | null }>>`
      SELECT b."id", b."title", c."title" AS category_title
      FROM "brd_boards" b LEFT JOIN "brd_categories" c ON c."id" = b."category_id"
      WHERE b."title" ILIKE ${q} ORDER BY b."position" ASC LIMIT 20
    `
    return rows.map((r) => ({ id: r.id, label: r.title, hint: r.category_title ?? undefined }))
  }
  if (kind === 'sub-board') {
    const rows = await prisma.$queryRaw<Array<{ id: string; title: string; board_title: string }>>`
      SELECT sb."id", sb."title", b."title" AS board_title
      FROM "brd_sub_boards" sb JOIN "brd_boards" b ON b."id" = sb."board_id"
      WHERE sb."title" ILIKE ${q} ORDER BY sb."position" ASC LIMIT 20
    `
    return rows.map((r) => ({ id: r.id, label: r.title, hint: r.board_title }))
  }
  if (kind === 'tag') {
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT "id", "name" FROM "brd_tags" WHERE "name" ILIKE ${q} ORDER BY "name" ASC LIMIT 20
    `
    return rows.map((r) => ({ id: r.id, label: r.name }))
  }
  return []
}

async function resolveEntity(kind: string, id: string): Promise<ResolvedMenuEntity | null> {
  if (kind === 'home') {
    return { label: 'Boards', href: '/boards', publiclyVisible: true }
  }
  if (kind === 'category') {
    const rows = await prisma.$queryRaw<Array<{ title: string }>>`SELECT "title" FROM "brd_categories" WHERE "id" = ${id} LIMIT 1`
    if (!rows[0]) return null
    return { label: rows[0].title, href: `/boards#cat-${id}`, publiclyVisible: true }
  }
  if (kind === 'board') {
    const rows = await prisma.$queryRaw<Array<{ title: string; slug: string; visibility: string }>>`
      SELECT "title", "slug", "visibility" FROM "brd_boards" WHERE "id" = ${id} LIMIT 1
    `
    if (!rows[0]) return null
    return { label: rows[0].title, href: `/boards/${rows[0].slug}`, publiclyVisible: rows[0].visibility === 'PUBLIC' }
  }
  if (kind === 'sub-board') {
    const rows = await prisma.$queryRaw<Array<{ title: string; slug: string; board_slug: string; visibility: string }>>`
      SELECT sb."title", sb."slug", b."slug" AS board_slug, b."visibility"
      FROM "brd_sub_boards" sb JOIN "brd_boards" b ON b."id" = sb."board_id"
      WHERE sb."id" = ${id} LIMIT 1
    `
    if (!rows[0]) return null
    return {
      label: rows[0].title,
      href: `/boards/${rows[0].board_slug}/${rows[0].slug}`,
      publiclyVisible: rows[0].visibility === 'PUBLIC',
    }
  }
  if (kind === 'tag') {
    const rows = await prisma.$queryRaw<Array<{ name: string; slug: string }>>`SELECT "name", "slug" FROM "brd_tags" WHERE "id" = ${id} LIMIT 1`
    if (!rows[0]) return null
    return { label: rows[0].name, href: `/boards/tag/${rows[0].slug}`, publiclyVisible: true }
  }
  return null
}

export const boardsMenuEntityProvider: MenuEntityProvider = {
  moduleLabel: 'Boards',
  listKinds,
  searchEntities,
  resolveEntity,
}
