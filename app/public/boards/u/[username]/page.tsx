import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { getUserProfileByUsername } from '@/modules/boards/lib/db'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await getUserProfileByUsername(username)
  return { title: profile ? profile.username : 'Member' }
}

export default async function MemberProfilePage({ params }: Props) {
  const { username } = await params
  const profile = await getUserProfileByUsername(username)
  if (!profile) notFound()

  const [recentThreads, recentPosts] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; title: string; slug: string }>>`
      SELECT "id", "title", "slug" FROM "brd_threads" WHERE "author_id" = ${profile.userId} AND "status" = 'PUBLISHED'
      ORDER BY "created_at" DESC LIMIT 10
    `,
    prisma.$queryRaw<Array<{ id: string; thread_id: string; thread_title: string; thread_slug: string }>>`
      SELECT p."id", t."id" AS thread_id, t."title" AS thread_title, t."slug" AS thread_slug
      FROM "brd_posts" p JOIN "brd_threads" t ON t."id" = p."thread_id"
      WHERE p."author_id" = ${profile.userId} AND p."status" = 'PUBLISHED'
      ORDER BY p."created_at" DESC LIMIT 10
    `,
  ])

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        {profile.avatarId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/media/${profile.avatarId}`} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <div>
          <h1 style={{ margin: 0 }}>{profile.username}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            {profile.postCount} posts · joined {profile.createdAt.toLocaleDateString()}
          </p>
        </div>
      </div>

      {profile.bio && <p>{profile.bio}</p>}
      {profile.signature && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          {profile.signature}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Recent threads</h2>
        {recentThreads.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No threads yet.</p>}
        {recentThreads.map((t) => <div key={t.id}><Link href={`/boards/t/${t.slug}`}>{t.title}</Link></div>)}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Recent posts</h2>
        {recentPosts.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No posts yet.</p>}
        {recentPosts.map((p) => <div key={p.id}><Link href={`/boards/t/${p.thread_slug}#post-${p.id}`}>{p.thread_title}</Link></div>)}
      </div>
    </div>
  )
}
