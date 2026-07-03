import { prisma } from '@/lib/db/prisma'
import { slugifyTitle, ensureUniqueBoardSlug, ensureUniqueThreadSlug } from '@/modules/boards/lib/slug'
import { htmlToOpenerData, htmlToPostBody } from './convert'
import type { ParsedImportBoard } from './types'

export type RunImportResult = {
  boardsImported: number
  threadsImported: number
  postsImported: number
  skipped: number
  errors: number
}

// The import source is encoded in each parsed item's `importedFrom` prefix
// (e.g. "phpbb:topic:1"), so this orchestrator doesn't need it separately.
export async function runBoardsImport(boards: ParsedImportBoard[], dryRun: boolean): Promise<RunImportResult> {
  const stats: RunImportResult = { boardsImported: 0, threadsImported: 0, postsImported: 0, skipped: 0, errors: 0 }

  const allEmails = [
    ...new Set(boards.flatMap((b) => b.threads.flatMap((t) => t.posts.map((p) => p.authorEmail).filter((e): e is string => !!e)))),
  ]
  const users = allEmails.length
    ? await prisma.user.findMany({ where: { email: { in: allEmails } }, select: { id: true, email: true } })
    : []
  const userIdByEmail = new Map(users.map((u) => [u.email, u.id]))

  for (const board of boards) {
    try {
      let boardRow = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "brd_boards" WHERE LOWER("title") = LOWER(${board.title}) LIMIT 1
      `
      let boardId = boardRow[0]?.id

      if (!boardId) {
        if (dryRun) {
          stats.boardsImported++
        } else {
          const slug = await ensureUniqueBoardSlug(slugifyTitle(board.title))
          const [created] = await prisma.$queryRaw<Array<{ id: string }>>`
            INSERT INTO "brd_boards" ("title", "slug") VALUES (${board.title}, ${slug}) RETURNING "id"
          `
          boardId = created!.id
          stats.boardsImported++
        }
      }

      for (const thread of board.threads) {
        const [existingThread] = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "brd_threads" WHERE "imported_from" = ${thread.importedFrom} LIMIT 1
        `
        if (existingThread) {
          stats.skipped += thread.posts.length
          continue
        }

        if (dryRun) {
          stats.threadsImported++
          stats.postsImported += thread.posts.length
          continue
        }
        if (!boardId) { stats.errors++; continue }

        const opener = thread.posts[0]!
        const replies = thread.posts.slice(1)
        const authorId = opener.authorEmail ? userIdByEmail.get(opener.authorEmail) ?? null : null
        const authorName = authorId ? '' : (opener.importedAuthorName ?? 'Unknown')
        const slug = await ensureUniqueThreadSlug(slugifyTitle(thread.title))

        const [createdThread] = await prisma.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "brd_threads" ("board_id", "title", "slug", "author_id", "author_name", "opener_data", "imported_from", "created_at")
          VALUES (
            ${boardId}, ${thread.title}, ${slug}, ${authorId}, ${authorName || 'Unknown'},
            ${JSON.stringify(htmlToOpenerData(opener.bodyHtml))}::jsonb, ${thread.importedFrom},
            ${opener.createdAt ?? new Date()}
          )
          RETURNING "id"
        `
        const threadId = createdThread!.id
        stats.threadsImported++
        stats.postsImported++

        for (const post of replies) {
          const [existingPost] = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "brd_posts" WHERE "imported_from" = ${post.importedFrom} LIMIT 1
          `
          if (existingPost) { stats.skipped++; continue }

          const postAuthorId = post.authorEmail ? userIdByEmail.get(post.authorEmail) ?? null : null
          const postAuthorName = postAuthorId ? '' : (post.importedAuthorName ?? 'Unknown')
          const { bodyHtml, bodySource } = htmlToPostBody(post.bodyHtml)

          await prisma.$executeRaw`
            INSERT INTO "brd_posts" ("thread_id", "author_id", "author_name", "body_html", "body_source", "imported_from", "created_at")
            VALUES (
              ${threadId}, ${postAuthorId}, ${postAuthorName || 'Unknown'}, ${bodyHtml}, ${bodySource as any}::jsonb,
              ${post.importedFrom}, ${post.createdAt ?? new Date()}
            )
          `
          stats.postsImported++
        }

        await prisma.$executeRaw`
          UPDATE "brd_threads" t SET
            "reply_count" = (SELECT COUNT(*) FROM "brd_posts" p WHERE p."thread_id" = t."id"),
            "last_post_at" = (SELECT MAX(p."created_at") FROM "brd_posts" p WHERE p."thread_id" = t."id")
          WHERE t."id" = ${threadId}
        `
      }
    } catch (err) {
      console.error('[boards/import] board import failed:', err)
      stats.errors++
    }
  }

  return stats
}
