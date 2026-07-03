import type { ParsedImportBoard, ParsedImportThread, ParsedImportPost } from './types'

type DiscoursePost = {
  id?: number | string
  email?: string
  username?: string
  cooked?: string
  raw?: string
  created_at?: string
}
type DiscourseTopic = {
  id?: number | string
  title?: string
  posts?: DiscoursePost[]
}
type DiscourseCategory = {
  id?: number | string
  name?: string
  topics?: DiscourseTopic[]
}
type DiscourseExport = { categories?: DiscourseCategory[] }

// Expected export shape (documented for admins in the import wizard):
//
//   { "categories": [ { "id", "name", "topics": [
//       { "id", "title", "posts": [
//           { "id", "email", "username", "cooked", "created_at" } ] } ] } ] }
//
// `cooked` (Discourse's own term for rendered post HTML) is used as the body;
// falls back to `raw` (source markdown, rendered as plain paragraphs) if absent.
export function parseDiscourseJson(json: string): ParsedImportBoard[] {
  let data: DiscourseExport
  try {
    data = JSON.parse(json)
  } catch {
    return []
  }

  const boards: ParsedImportBoard[] = []

  for (const category of data.categories ?? []) {
    if (!category.name) continue

    const threads: ParsedImportThread[] = []
    for (const topic of category.topics ?? []) {
      if (!topic.title) continue

      const posts: ParsedImportPost[] = []
      for (const post of topic.posts ?? []) {
        const bodyHtml = post.cooked ?? (post.raw ? `<p>${post.raw.replace(/\n/g, '<br/>')}</p>` : '')
        const createdAt = post.created_at ? new Date(post.created_at) : null

        posts.push({
          importedFrom: `discourse:post:${post.id ?? crypto.randomUUID()}`,
          authorEmail: post.email ?? null,
          importedAuthorName: post.email ? null : (post.username ?? null),
          bodyHtml,
          createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
        })
      }

      if (posts.length === 0) continue
      threads.push({
        importedFrom: `discourse:topic:${topic.id ?? crypto.randomUUID()}`,
        title: topic.title,
        posts,
      })
    }

    boards.push({
      importedFrom: `discourse:category:${category.id ?? crypto.randomUUID()}`,
      title: category.name,
      threads,
    })
  }

  return boards
}
