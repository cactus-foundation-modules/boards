import { prisma } from '@/lib/db/prisma'
import type { ModerationItemType } from './types'

export async function logModerationAction(input: {
  actorId: string | null
  actorName: string
  action: string
  // 'THREAD' | 'POST' for content actions; also accepts 'USER' for the warn
  // action (brd_moderation_log.item_type has no CHECK constraint, unlike
  // brd_moderation_queue/brd_reports which are strictly THREAD|POST).
  itemType?: ModerationItemType | 'USER'
  itemId?: string
  detail?: Record<string, unknown>
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "brd_moderation_log" ("actor_id", "actor_name", "action", "item_type", "item_id", "detail")
    VALUES (
      ${input.actorId}, ${input.actorName}, ${input.action},
      ${input.itemType ?? null}, ${input.itemId ?? null},
      ${input.detail ? JSON.stringify(input.detail) : null}::jsonb
    )
  `
}

export async function enqueueModerationItem(itemType: ModerationItemType, itemId: string, reason: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "brd_moderation_queue" ("item_type", "item_id", "reason") VALUES (${itemType}, ${itemId}, ${reason})
  `
}

// Word-filter check: any configured term present (case-insensitive) in the given text.
export function matchesWordFilter(text: string, wordFilter: string[] | null): string | null {
  if (!wordFilter || wordFilter.length === 0) return null
  const lower = text.toLowerCase()
  const hit = wordFilter.find((term) => term && lower.includes(term.toLowerCase()))
  return hit ?? null
}

// New-account moderation rule (BOARDS_SPEC 3): established accounts skip the
// queue even on their first Boards post.
export function needsNewAccountModeration(
  postCount: number,
  accountCreatedAt: Date,
  firstPostCount: number,
  firstPostAccountAgeDays: number
): boolean {
  if (firstPostCount <= 0) return false
  if (postCount >= firstPostCount) return false
  const ageDays = (Date.now() - accountCreatedAt.getTime()) / 86_400_000
  return ageDays < firstPostAccountAgeDays
}
