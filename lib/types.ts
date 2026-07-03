export type BoardVisibility = 'PUBLIC' | 'MEMBERS' | 'PRIVATE'

export type ThreadStatus = 'PUBLISHED' | 'PENDING' | 'HIDDEN' | 'DELETED' | 'ARCHIVED'
export type PostStatus = 'PUBLISHED' | 'PENDING' | 'HIDDEN' | 'DELETED'

export type ModerationItemType = 'THREAD' | 'POST'
export type ModerationQueueStatus = 'OPEN' | 'APPROVED' | 'REJECTED'
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

export type NotificationMode = 'IMMEDIATE' | 'DIGEST' | 'OFF'

export type ImportSource = 'PHPBB' | 'DISCOURSE'
export type ImportJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export type BoardsCategory = {
  id: string
  title: string
  position: number
  createdAt: Date
  updatedAt: Date
}

export type BoardsBoard = {
  id: string
  categoryId: string | null
  title: string
  slug: string
  description: string | null
  position: number
  iconEmoji: string | null
  iconMediaId: string | null
  isLocked: boolean
  visibility: BoardVisibility
  noindex: boolean
  minPostLength: number | null
  wordFilter: string[] | null
  createdAt: Date
  updatedAt: Date
}

export type BoardsSubBoard = {
  id: string
  boardId: string
  title: string
  slug: string
  description: string | null
  position: number
  isLocked: boolean
  createdAt: Date
  updatedAt: Date
}

export type BoardsTag = {
  id: string
  name: string
  slug: string
  createdAt: Date
}

export type BoardsThread = {
  id: string
  boardId: string
  subBoardId: string | null
  title: string
  slug: string
  authorId: string | null
  authorName: string
  openerData: unknown
  status: ThreadStatus
  isPinned: boolean
  isLocked: boolean
  isGlobalAnnouncement: boolean
  viewCount: number
  replyCount: number
  lastPostAt: Date | null
  ipAddress: string | null
  importedFrom: string | null
  createdAt: Date
  updatedAt: Date
}

export type BoardsPost = {
  id: string
  threadId: string
  authorId: string | null
  authorName: string
  bodyHtml: string
  bodySource: unknown
  replyToPostId: string | null
  status: PostStatus
  editedAt: Date | null
  editedBy: string | null
  ipAddress: string | null
  importedFrom: string | null
  createdAt: Date
  updatedAt: Date
}

export type BoardsSettings = {
  id: string
  threadsPerPage: number
  postsPerPage: number
  rssEnabled: boolean
  feedTitle: string | null
  feedDescription: string | null
  reactionsEnabled: boolean
  reactionSet: string[] | null
  signaturesEnabled: boolean
  signatureMaxLength: number
  minAccountAgeDays: number
  firstPostCount: number
  firstPostAccountAgeDays: number
  postCooldownSeconds: number
  postsPerHourLimit: number
  editWindowMinutes: number
  showViewCounts: boolean
  updatedAt: Date
}

export type BoardsAccess = {
  isAdminUser: boolean
  isGlobalModerator: boolean
  // boardId -> true for boards this user moderates
  moderatedBoardIds: Set<string>
}

export type BoardsUserProfile = {
  id: string
  userId: string
  username: string
  signature: string | null
  avatarId: string | null
  bio: string | null
  postCount: number
  lastSeenAt: Date | null
  createdAt: Date
  updatedAt: Date
}
