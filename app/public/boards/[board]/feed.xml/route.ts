import { getSiteUrlOrNull } from '@/lib/config/env'
import { getBoardBySlug } from '@/modules/boards/lib/db'
import { getBoardsSettings } from '@/modules/boards/lib/settings'
import { buildRssXml } from '@/modules/boards/lib/feed'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ board: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { board: slug } = await params
  const board = await getBoardBySlug(slug)
  if (!board || board.visibility !== 'PUBLIC' || board.noindex) return new Response('Not found', { status: 404 })

  const settings = await getBoardsSettings()
  if (!settings.rssEnabled) return new Response('Not found', { status: 404 })

  const siteUrl = getSiteUrlOrNull() ?? ''

  const threads = await prisma.$queryRaw<Array<{ title: string; slug: string; author_name: string | null; created_at: Date }>>`
    SELECT "title", "slug", "author_name", "created_at" FROM "brd_threads"
    WHERE "board_id" = ${board.id} AND "sub_board_id" IS NULL AND "status" = 'PUBLISHED'
    ORDER BY "created_at" DESC LIMIT 20
  `

  const xml = buildRssXml({
    siteUrl,
    channelUrl: `${siteUrl}/boards/${slug}`,
    settings,
    defaultTitle: board.title as string,
    threads: threads.map((t) => ({ title: t.title, slug: t.slug, authorName: t.author_name, createdAt: t.created_at })),
  })

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
