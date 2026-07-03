import { prisma } from '@/lib/db/prisma'

const MENTION_RE = /@([a-zA-Z0-9_-]{2,32})/g
const MAX_MENTIONS = 10

// Parses @username tokens from plain text, dedupes, caps at MAX_MENTIONS.
export function parseMentionUsernames(text: string): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(MENTION_RE)) {
    found.add(match[1]!.toLowerCase())
    if (found.size >= MAX_MENTIONS) break
  }
  return Array.from(found)
}

// Resolves parsed usernames to user ids via brd_user_profiles, case-insensitively,
// excluding the author's own id (no self-mention notifications).
export async function resolveMentionedUserIds(usernames: string[], excludeUserId: string): Promise<string[]> {
  if (usernames.length === 0) return []
  const rows = await prisma.$queryRaw<Array<{ user_id: string }>>`
    SELECT "user_id" FROM "brd_user_profiles" WHERE LOWER("username") = ANY(${usernames})
  `
  return rows.map((r) => r.user_id).filter((id) => id !== excludeUserId)
}
