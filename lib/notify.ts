import { prisma } from '@/lib/db/prisma'
import { sendEmail } from '@/lib/email'
import { getSiteUrlOrNull } from '@/lib/config/env'
import { isEmailConfigured } from '@/lib/config/env'

// Boards calls a shared core notification interface behind this single
// function; it does not implement delivery, preferences UI beyond its own
// `mode` setting, or the admin bell. Until the core per-user notification
// system (NOTIFICATIONS_SPEC.md, protected item 1) ships, this degrades to an
// email-only/no-op fallback so Boards compiles and works standalone.
export type BoardsNotification = {
  userId: string
  title: string
  link: string
  dedupeKey?: string
}

export async function notifyUser(n: BoardsNotification): Promise<void> {
  try {
    const prefRows = await prisma.$queryRaw<Array<{ mode: string; email_enabled: boolean }>>`
      SELECT "mode", "email_enabled" FROM "brd_notification_prefs" WHERE "user_id" = ${n.userId} LIMIT 1
    `
    const pref = prefRows[0] ?? { mode: 'IMMEDIATE', email_enabled: true }
    if (pref.mode !== 'IMMEDIATE' || !pref.email_enabled) return
    if (!isEmailConfigured()) return

    const userRows = await prisma.$queryRaw<Array<{ email: string }>>`
      SELECT "email" FROM "User" WHERE "id" = ${n.userId} LIMIT 1
    `
    const user = userRows[0]
    if (!user) return

    const siteUrl = getSiteUrlOrNull() ?? ''
    const url = `${siteUrl}${n.link}`

    await sendEmail({
      to: user.email,
      subject: n.title,
      html: `<p>${n.title}</p><p><a href="${url}">${url}</a></p>`,
      text: `${n.title}\n${url}`,
    })
  } catch (err) {
    // Fire-and-forget: notifications never block the write path.
    console.error('[boards/notify] notifyUser failed:', err)
  }
}
