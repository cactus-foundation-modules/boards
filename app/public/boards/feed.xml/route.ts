import { prisma } from '@/lib/db/prisma'
import { getSiteUrlOrNull } from '@/lib/config/env'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import { buildRssXml } from '@/modules/boards/lib/feed'

export async function GET() {
  const settings = await getBoardsSettings()
  if (!settings.rssEnabled) return new Response('Not found', { status: 404 })

  const siteUrl = getSiteUrlOrNull() ?? ''

  const threads = await prisma.$queryRaw<Array<{ title: string; slug: string; author_name: string | null; created_at: Date }>>`
    SELECT t."title", t."slug", t."author_name", t."created_at"
    FROM "brd_threads" t JOIN "brd_boards" b ON b."id" = t."board_id"
    WHERE t."status" = 'PUBLISHED' AND b."visibility" = 'PUBLIC' AND b."noindex" = false
    ORDER BY t."created_at" DESC LIMIT 20
  `

  const xml = buildRssXml({
    siteUrl,
    channelUrl: `${siteUrl}/boards`,
    settings,
    defaultTitle: 'Boards',
    threads: threads.map((t) => ({ title: t.title, slug: t.slug, authorName: t.author_name, createdAt: t.created_at })),
  })

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
