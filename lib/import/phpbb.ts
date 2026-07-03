import { JSDOM } from 'jsdom'
import type { ParsedImportBoard, ParsedImportThread, ParsedImportPost } from './types'

function text(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? ''
}

function firstMatching(el: Element, names: string[]): Element | null {
  for (const name of names) {
    const found = el.querySelector(`:scope > ${name}`)
    if (found) return found
  }
  return null
}

// Expected export shape (third-party phpBB exporters vary; this is the shape
// documented for admins in the import wizard):
//
//   <phpbb>
//     <forums>
//       <forum><id/><name/>
//         <topics>
//           <topic><id/><title/>
//             <posts>
//               <post><id/><poster_email/><post_username/><post_time/><post_text/></post>
//             </posts>
//           </topic>
//         </topics>
//       </forum>
//     </forums>
//   </phpbb>
//
// Unrecognised tag names fall back gracefully to plain text (empty fields).
export function parsePhpBbXml(xml: string): ParsedImportBoard[] {
  const dom = new JSDOM(xml, { contentType: 'text/xml' })
  const doc = dom.window.document

  const boards: ParsedImportBoard[] = []

  for (const forumEl of Array.from(doc.querySelectorAll('forums > forum'))) {
    const forumId = text(firstMatching(forumEl, ['id', 'forum_id']))
    const title = text(firstMatching(forumEl, ['name', 'title']))
    if (!title) continue

    const threads: ParsedImportThread[] = []
    for (const topicEl of Array.from(forumEl.querySelectorAll('topics > topic'))) {
      const topicId = text(firstMatching(topicEl, ['id', 'topic_id']))
      const topicTitle = text(firstMatching(topicEl, ['title', 'topic_title']))
      if (!topicTitle) continue

      const posts: ParsedImportPost[] = []
      for (const postEl of Array.from(topicEl.querySelectorAll('posts > post'))) {
        const postId = text(firstMatching(postEl, ['id', 'post_id']))
        const authorEmail = text(firstMatching(postEl, ['poster_email', 'author_email'])) || null
        const importedAuthorName = text(firstMatching(postEl, ['post_username', 'username', 'author'])) || null
        const bodyHtml = text(firstMatching(postEl, ['post_text', 'message', 'body']))
        const timeRaw = text(firstMatching(postEl, ['post_time', 'created', 'date']))
        const createdAt = timeRaw ? new Date(/^\d+$/.test(timeRaw) ? Number(timeRaw) * 1000 : timeRaw) : null

        posts.push({
          importedFrom: `phpbb:post:${postId || crypto.randomUUID()}`,
          authorEmail,
          importedAuthorName,
          bodyHtml,
          createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
        })
      }

      if (posts.length === 0) continue
      threads.push({
        importedFrom: `phpbb:topic:${topicId || crypto.randomUUID()}`,
        title: topicTitle,
        posts,
      })
    }

    boards.push({
      importedFrom: `phpbb:forum:${forumId || crypto.randomUUID()}`,
      title,
      threads,
    })
  }

  return boards
}

// Converts the common BBCode subset to HTML; unknown tags degrade to plain
// text (tags stripped, content kept) rather than being embedded verbatim.
export function bbcodeToHtml(bbcode: string): string {
  let html = bbcode
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  html = html
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '$1')
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1">$2</a>')
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1">$1</a>')
    .replace(/\[quote(?:=[^\]]*)?\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>')
    .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre>$1</pre>')
    .replace(/\[list\]([\s\S]*?)\[\/list\]/gi, '<ul>$1</ul>')
    .replace(/\[\*\]([\s\S]*?)(?=\[\*\]|\[\/list\]|$)/gi, '<li>$1</li>')
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, '')
    .replace(/\[[a-z0-9]+(?:=[^\]]*)?\]/gi, '')
    .replace(/\[\/[a-z0-9]+\]/gi, '')

  return html
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}
