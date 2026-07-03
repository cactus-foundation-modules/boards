export type ParsedImportPost = {
  importedFrom: string
  authorEmail: string | null
  importedAuthorName: string | null
  bodyHtml: string
  createdAt: Date | null
}

export type ParsedImportThread = {
  importedFrom: string
  title: string
  // first entry is the thread opener, the rest are replies
  posts: ParsedImportPost[]
}

export type ParsedImportBoard = {
  importedFrom: string
  title: string
  threads: ParsedImportThread[]
}

export type ImportPreviewRow = {
  boardTitle: string
  threadCount: number
  postCount: number
  action: 'Import' | 'Skip'
}

export type ImportStats = {
  boardsImported: number
  threadsImported: number
  postsImported: number
  skipped: number
  errors: number
}
