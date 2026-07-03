import { prisma } from '@/lib/db/prisma'
import type { BoardsSettings } from './types'

export const DEFAULT_REACTION_SET = ['👍', '❤️', '🔥', '💡']

function mapRow(r: Record<string, unknown>): BoardsSettings {
  return {
    id: r.id as string,
    threadsPerPage: r.threads_per_page as number,
    postsPerPage: r.posts_per_page as number,
    rssEnabled: r.rss_enabled as boolean,
    feedTitle: (r.feed_title as string | null) ?? null,
    feedDescription: (r.feed_description as string | null) ?? null,
    reactionsEnabled: r.reactions_enabled as boolean,
    reactionSet: (r.reaction_set as string[] | null) ?? null,
    signaturesEnabled: r.signatures_enabled as boolean,
    signatureMaxLength: r.signature_max_length as number,
    minAccountAgeDays: r.min_account_age_days as number,
    firstPostCount: r.first_post_count as number,
    firstPostAccountAgeDays: r.first_post_account_age_days as number,
    postCooldownSeconds: r.post_cooldown_seconds as number,
    postsPerHourLimit: r.posts_per_hour_limit as number,
    editWindowMinutes: r.edit_window_minutes as number,
    showViewCounts: r.show_view_counts as boolean,
    updatedAt: r.updated_at as Date,
  }
}

const FALLBACK_SETTINGS: BoardsSettings = {
  id: 'singleton',
  threadsPerPage: 20,
  postsPerPage: 20,
  rssEnabled: true,
  feedTitle: null,
  feedDescription: null,
  reactionsEnabled: true,
  reactionSet: null,
  signaturesEnabled: true,
  signatureMaxLength: 500,
  minAccountAgeDays: 0,
  firstPostCount: 3,
  firstPostAccountAgeDays: 7,
  postCooldownSeconds: 30,
  postsPerHourLimit: 20,
  editWindowMinutes: 0,
  showViewCounts: true,
  updatedAt: new Date(),
}

export async function getBoardsSettings(): Promise<BoardsSettings> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM "brd_settings" WHERE "id" = 'singleton' LIMIT 1
  `
  const row = rows[0]
  const settings = row ? mapRow(row) : { ...FALLBACK_SETTINGS }
  if (!settings.reactionSet || settings.reactionSet.length === 0) {
    settings.reactionSet = DEFAULT_REACTION_SET
  }
  return settings
}

export type UpdateSettingsInput = Partial<{
  threadsPerPage: number
  postsPerPage: number
  rssEnabled: boolean
  feedTitle: string | null
  feedDescription: string | null
  reactionsEnabled: boolean
  reactionSet: string[]
  signaturesEnabled: boolean
  signatureMaxLength: number
  minAccountAgeDays: number
  firstPostCount: number
  firstPostAccountAgeDays: number
  postCooldownSeconds: number
  postsPerHourLimit: number
  editWindowMinutes: number
  showViewCounts: boolean
}>

export async function updateBoardsSettings(input: UpdateSettingsInput): Promise<BoardsSettings> {
  const current = await getBoardsSettings()
  const merged = { ...current, ...input }

  await prisma.$executeRaw`
    INSERT INTO "brd_settings" (
      "id", "threads_per_page", "posts_per_page", "rss_enabled", "feed_title", "feed_description",
      "reactions_enabled", "reaction_set", "signatures_enabled", "signature_max_length",
      "min_account_age_days", "first_post_count", "first_post_account_age_days",
      "post_cooldown_seconds", "posts_per_hour_limit", "edit_window_minutes", "show_view_counts",
      "updated_at"
    ) VALUES (
      'singleton', ${merged.threadsPerPage}, ${merged.postsPerPage}, ${merged.rssEnabled}, ${merged.feedTitle}, ${merged.feedDescription},
      ${merged.reactionsEnabled}, ${JSON.stringify(merged.reactionSet)}::jsonb, ${merged.signaturesEnabled}, ${merged.signatureMaxLength},
      ${merged.minAccountAgeDays}, ${merged.firstPostCount}, ${merged.firstPostAccountAgeDays},
      ${merged.postCooldownSeconds}, ${merged.postsPerHourLimit}, ${merged.editWindowMinutes}, ${merged.showViewCounts},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE SET
      "threads_per_page" = ${merged.threadsPerPage},
      "posts_per_page" = ${merged.postsPerPage},
      "rss_enabled" = ${merged.rssEnabled},
      "feed_title" = ${merged.feedTitle},
      "feed_description" = ${merged.feedDescription},
      "reactions_enabled" = ${merged.reactionsEnabled},
      "reaction_set" = ${JSON.stringify(merged.reactionSet)}::jsonb,
      "signatures_enabled" = ${merged.signaturesEnabled},
      "signature_max_length" = ${merged.signatureMaxLength},
      "min_account_age_days" = ${merged.minAccountAgeDays},
      "first_post_count" = ${merged.firstPostCount},
      "first_post_account_age_days" = ${merged.firstPostAccountAgeDays},
      "post_cooldown_seconds" = ${merged.postCooldownSeconds},
      "posts_per_hour_limit" = ${merged.postsPerHourLimit},
      "edit_window_minutes" = ${merged.editWindowMinutes},
      "show_view_counts" = ${merged.showViewCounts},
      "updated_at" = CURRENT_TIMESTAMP
  `
  return getBoardsSettings()
}
