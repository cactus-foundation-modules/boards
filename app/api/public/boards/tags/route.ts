import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// Read-only list backing the tag picker in the public thread composer.
export async function GET() {
  const tags = await prisma.$queryRaw`SELECT "id", "name", "slug" FROM "brd_tags" ORDER BY "name" ASC`
  return NextResponse.json({ tags })
}
