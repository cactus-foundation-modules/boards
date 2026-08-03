import { prisma } from '@/lib/db/prisma'
import { sendEmail } from '@/lib/email'
import { renderEmailTemplate } from '@/lib/email/render'
import { escapeHtml } from '@/lib/email/blocks'
import { isEmailConfigured, getSiteUrlOrNull } from '@/lib/config/env'

type DigestUser = { user_id: string; email: string; last_digest_at: Date | null }

export async function runDigest(): Promise<{ sent: number }> {
  if (!isEmailConfigured()) return { sent: 0 }

  const users = await prisma.$queryRaw<DigestUser[]>`
    SELECT p."user_id", u."email", p."last_digest_at"
    FROM "brd_notification_prefs" p
    JOIN "User" u ON u."id" = p."user_id"
    WHERE p."mode" = 'DIGEST' AND p."email_enabled" = true
  `

  const siteUrl = getSiteUrlOrNull() ?? ''
  let sent = 0

  for (const user of users) {
    const since = user.last_digest_at ?? new Date(0)

    const newThreads = await prisma.$queryRaw<Array<{ title: string; slug: string }>>`
      SELECT t."title", t."slug" FROM "brd_threads" t
      JOIN "brd_board_subscriptions" s ON s."board_id" = t."board_id" AND s."user_id" = ${user.user_id}
      WHERE t."created_at" > ${since} AND t."status" = 'PUBLISHED'
      ORDER BY t."created_at" DESC LIMIT 20
    `
    const newReplies = await prisma.$queryRaw<Array<{ title: string; slug: string; reply_count: bigint }>>`
      SELECT t."title", t."slug", COUNT(p."id") AS reply_count
      FROM "brd_posts" p
      JOIN "brd_threads" t ON t."id" = p."thread_id"
      JOIN "brd_thread_subscriptions" s ON s."thread_id" = t."id" AND s."user_id" = ${user.user_id}
      WHERE p."created_at" > ${since} AND p."status" = 'PUBLISHED'
      GROUP BY t."id", t."title", t."slug"
      ORDER BY MAX(p."created_at") DESC LIMIT 20
    `

    if (newThreads.length === 0 && newReplies.length === 0) continue

    // Titles are member-written, so they are escaped here before going into the
    // list markup - which then travels as a rawTag, because the <li> and <a>
    // around them have to survive core's escaping.
    const items: string[] = []
    for (const t of newThreads) {
      items.push(`<li>New thread: <a href="${siteUrl}/boards/t/${encodeURIComponent(t.slug)}">${escapeHtml(t.title)}</a></li>`)
    }
    for (const t of newReplies) {
      const count = Number(t.reply_count)
      items.push(`<li>${count} new repl${count === 1 ? 'y' : 'ies'} in: <a href="${siteUrl}/boards/t/${encodeURIComponent(t.slug)}">${escapeHtml(t.title)}</a></li>`)
    }

    try {
      const rendered = await renderEmailTemplate('boards.digest', { items: items.join('') })
      if (rendered) {
        await sendEmail({ to: user.email, subject: rendered.subject, html: rendered.html, text: rendered.text })
        sent++
      }
    } catch (err) {
      console.error('[boards/digest] sendEmail failed:', err)
    }

    await prisma.$executeRaw`UPDATE "brd_notification_prefs" SET "last_digest_at" = CURRENT_TIMESTAMP WHERE "user_id" = ${user.user_id}`
  }

  return { sent }
}
