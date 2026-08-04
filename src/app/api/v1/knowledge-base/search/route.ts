import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate } from '@/lib/authGuard';
import { validateData } from '@/lib/validate';
import { successBody } from '@/shared/utils/ApiResponse';
import * as knowledgeBaseService from '@/modules/knowledgeBase/knowledgeBase.service';
import { searchKnowledgeQuerySchema } from '@/modules/knowledgeBase/knowledgeBase.validation';

// A static segment (/knowledge-base/search) — Next.js's file-based router
// resolves this ahead of the dynamic /knowledge-base/[id] segment
// automatically, no explicit ordering needed (unlike Express, where the
// original route registration order mattered).
export const GET = apiHandler(async (request: NextRequest) => {
  authenticate(request);
  await connectDB();

  const sp = request.nextUrl.searchParams;
  const { type, q } = validateData(searchKnowledgeQuerySchema, {
    type: sp.get('type') ?? undefined,
    q: sp.get('q') ?? undefined,
  });

  const result = await knowledgeBaseService.searchEntries(type, q);
  return NextResponse.json(successBody(result), { status: 200 });
});
