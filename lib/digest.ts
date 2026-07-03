import { prisma } from '@/lib/db/prisma'
import { sendEmail } from '@/lib/email'
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

    const lines: string[] = []
    for (const t of newThreads) lines.push(`New thread: ${t.title} - ${siteUrl}/boards/t/${t.slug}`)
    for (const t of newReplies) lines.push(`${Number(t.reply_count)} new repl${Number(t.reply_count) === 1 ? 'y' : 'ies'} in: ${t.title} - ${siteUrl}/boards/t/${t.slug}`)

    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Boards digest',
        html: `<p>Here's what's new in your subscriptions:</p><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`,
        text: lines.join('\n'),
      })
      sent++
    } catch (err) {
      console.error('[boards/digest] sendEmail failed:', err)
    }

    await prisma.$executeRaw`UPDATE "brd_notification_prefs" SET "last_digest_at" = CURRENT_TIMESTAMP WHERE "user_id" = ${user.user_id}`
  }

  return { sent }
}
