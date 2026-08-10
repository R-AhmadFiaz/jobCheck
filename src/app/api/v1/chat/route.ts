import { NextResponse, type NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { getClientIp } from '@/lib/getClientIp';
import { checkChatRateLimit } from '@/lib/rateLimit/rateLimit';
import { successBody } from '@/shared/utils/ApiResponse';
import { chatRequestSchema } from '@/modules/chat/chat.validation';
import { sendChatMessage } from '@/modules/chat/chat.service';

// Public, unauthenticated, IP rate-limited — same pattern as
// analyze/public and contact. No conversation persistence: the client
// resends its own session history each request (see chat.service.ts).
export const POST = apiHandler(
  async (request: NextRequest) => {
    await checkChatRateLimit(getClientIp(request));

    const input = validateData(chatRequestSchema, await readJsonBody(request));
    const reply = await sendChatMessage(input);

    return NextResponse.json(successBody({ reply }), { status: 200 });
  },
  { public: true },
);
