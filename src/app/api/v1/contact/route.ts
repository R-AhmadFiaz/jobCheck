import { NextResponse, type NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { getClientIp } from '@/lib/getClientIp';
import { checkContactRateLimit } from '@/lib/rateLimit/rateLimit';
import { successBody } from '@/shared/utils/ApiResponse';
import { contactMessageSchema } from '@/modules/contact/contact.validation';
import { submitContactMessage } from '@/modules/contact/contact.service';

// Public, unauthenticated, IP rate-limited — same pattern as
// analyze/public/route.ts. No database persistence (see contact.service.ts).
export const POST = apiHandler(
  async (request: NextRequest) => {
    await checkContactRateLimit(getClientIp(request));

    const input = validateData(contactMessageSchema, await readJsonBody(request));
    await submitContactMessage(input);

    return NextResponse.json(
      successBody({ message: 'Your message has been sent. We will get back to you soon.' }),
      { status: 200 },
    );
  },
  { public: true },
);
