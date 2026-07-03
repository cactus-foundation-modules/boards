import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/utils'
import { runDigest } from '@/modules/boards/lib/digest'

// Vercel Cron always invokes via GET (appending `Authorization: Bearer
// $CRON_SECRET` automatically), same as the contact-form retention cron; POST
// is also accepted for manual/admin-triggered runs since BOARDS_SPEC labels
// this endpoint as POST.
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return errorResponse('CRON_SECRET is not configured', 503)

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return errorResponse('Unauthorized', 401)

  const result = await runDigest()
  return NextResponse.json({ ok: true, ...result })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
