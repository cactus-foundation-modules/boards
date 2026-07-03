import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db/prisma'

export async function getPublicSitemapEntries(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const boards = await prisma.$queryRaw<Array<{ slug: string; updated_at: Date }>>`
    SELECT "slug", "updated_at" FROM "brd_boards" WHERE "visibility" = 'PUBLIC' AND "noindex" = false
  `
  const subBoards = await prisma.$queryRaw<Array<{ board_slug: string; slug: string; updated_at: Date }>>`
    SELECT b."slug" AS "board_slug", sb."slug", sb."updated_at"
    FROM "brd_sub_boards" sb
    JOIN "brd_boards" b ON b."id" = sb."board_id"
    WHERE b."visibility" = 'PUBLIC' AND b."noindex" = false
  `
  const threads = await prisma.$queryRaw<Array<{ slug: string; updated_at: Date }>>`
    SELECT t."slug", t."updated_at"
    FROM "brd_threads" t
    JOIN "brd_boards" b ON b."id" = t."board_id"
    WHERE t."status" = 'PUBLISHED' AND b."visibility" = 'PUBLIC' AND b."noindex" = false
  `

  return [
    { url: `${siteUrl}/boards`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    ...boards.map((b) => ({
      url: `${siteUrl}/boards/${b.slug}`,
      lastModified: b.updated_at,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...subBoards.map((sb) => ({
      url: `${siteUrl}/boards/${sb.board_slug}/${sb.slug}`,
      lastModified: sb.updated_at,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
    ...threads.map((t) => ({
      url: `${siteUrl}/boards/t/${t.slug}`,
      lastModified: t.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ]
}
