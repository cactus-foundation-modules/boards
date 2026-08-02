'use client'

const VISITOR_COOKIE = 'cactus-boards-vid'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split(';').find((s) => s.trim().startsWith(`${name}=`))
  if (!match) return null
  // decodeURIComponent throws URIError on a malformed escape ("%", "%zz"),
  // which anything at all can leave in the cookie jar for this domain. Thrown
  // from here it took the caller down on a public page. A cookie we cannot
  // read is one we simply reissue.
  try {
    return decodeURIComponent(match.trim().slice(name.length + 1))
  } catch {
    return null
  }
}

function writeCookie(name: string, value: string, maxAgeDays: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeDays * 86400}; SameSite=Lax`
}

export function getOrCreateVisitorToken(): string {
  const existing = readCookie(VISITOR_COOKIE)
  if (existing) return existing
  const id = crypto.randomUUID()
  writeCookie(VISITOR_COOKIE, id, 365 * 2)
  return id
}
