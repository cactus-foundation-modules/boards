import { prisma } from '@/lib/db/prisma'

// Provider for the core.media-usage-providers extension point.
//
// Board icons and member profile pictures are plain Media id columns core has no
// sight of, so both used to be counted as unused library clutter.
export async function boardsMediaUsageProvider(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ ref: string | null }[]>`
    SELECT "icon_media_id" AS ref FROM "brd_boards" WHERE "icon_media_id" IS NOT NULL
    UNION ALL
    SELECT "avatar_id" AS ref FROM "brd_user_profiles" WHERE "avatar_id" IS NOT NULL
  `
  return rows.map((r) => r.ref).filter((r): r is string => !!r)
}
