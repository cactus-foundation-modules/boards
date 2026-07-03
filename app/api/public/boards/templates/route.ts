import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// Read-only list backing the new-thread template chooser.
export async function GET() {
  const templates = await prisma.$queryRaw`SELECT "id", "title", "builder_data" FROM "brd_thread_templates" ORDER BY "title" ASC`
  return NextResponse.json({ templates })
}
