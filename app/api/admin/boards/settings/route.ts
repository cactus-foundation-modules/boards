import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions/check'
import { errorResponse } from '@/lib/utils'
import { getBoardsSettings, updateBoardsSettings } from '@/modules/boards/lib/settings'

export async function GET() {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const settings = await getBoardsSettings()
  return NextResponse.json(settings)
}

const PatchBody = z.object({
  threadsPerPage: z.number().int().min(1).max(100).optional(),
  postsPerPage: z.number().int().min(1).max(100).optional(),
  rssEnabled: z.boolean().optional(),
  feedTitle: z.string().nullable().optional(),
  feedDescription: z.string().nullable().optional(),
  reactionsEnabled: z.boolean().optional(),
  reactionSet: z.array(z.string()).optional(),
  signaturesEnabled: z.boolean().optional(),
  signatureMaxLength: z.number().int().min(0).max(5000).optional(),
  minAccountAgeDays: z.number().int().min(0).optional(),
  firstPostCount: z.number().int().min(0).optional(),
  firstPostAccountAgeDays: z.number().int().min(0).optional(),
  postCooldownSeconds: z.number().int().min(0).optional(),
  postsPerHourLimit: z.number().int().min(0).optional(),
  editWindowMinutes: z.number().int().min(0).optional(),
  showViewCounts: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
  const user = await getSessionFromCookie()
  if (!user) return errorResponse('Not authenticated', 401)
  if (!(await hasPermission(user, 'boards.manage'))) return errorResponse('Forbidden', 403)

  const parsed = PatchBody.safeParse(await request.json())
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid input')

  const settings = await updateBoardsSettings(parsed.data)
  return NextResponse.json(settings)
}
