import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSessionFromCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getBoardsAccess } from '@/modules/boards/lib/permissions'
import { getVisibleBoardIds } from '@/modules/boards/lib/visibility'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tag = await prisma.$queryRaw<Array<{ name: string }>>`SELECT "name" FROM "brd_tags" WHERE "slug" = ${slug} LIMIT 1`
  if (!tag[0]) return {}
  return { title: `${tag[0].name} - Boards` }
}

export default async function BoardsTagPage({ params }: Props) {
  const { slug } = await params
  const tag = await prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT "id", "name" FROM "brd_tags" WHERE "slug" = ${slug} LIMIT 1`
  if (!tag[0]) notFound()

  const user = await getSessionFromCookie()
  const access = user ? await getBoardsAccess(user) : null
  const visibleBoardIds = await getVisibleBoardIds(!!user, access)

  const threads = visibleBoardIds.length > 0
    ? await prisma.$queryRaw<Array<{ id: string; title: string; slug: string; board_title: string }>>`
        SELECT t."id", t."title", t."slug", b."title" AS board_title
        FROM "brd_threads" t
        JOIN "brd_thread_tags" tt ON tt."thread_id" = t."id"
        JOIN "brd_boards" b ON b."id" = t."board_id"
        WHERE tt."tag_id" = ${tag[0].id} AND t."status" = 'PUBLISHED' AND t."board_id" = ANY(${visibleBoardIds})
        ORDER BY t."created_at" DESC LIMIT 100
      `
    : []

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Tag: {tag[0].name}</h1>
      {threads.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No threads tagged with this yet.</p>}
      {threads.map((t) => (
        <div key={t.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
          <Link href={`/boards/t/${t.slug}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--color-text)' }}>{t.title}</Link>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t.board_title}</div>
        </div>
      ))}
    </div>
  )
}
