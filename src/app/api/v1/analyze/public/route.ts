import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { validateData } from '@/lib/validate';
import { parseUploadedFile } from '@/lib/parseUploadedFile';
import { checkPublicAnalysisRateLimit } from '@/lib/rateLimit/rateLimit';
import { getClientIp } from '@/lib/getClientIp';
import { successBody } from '@/shared/utils/ApiResponse';
import { ApiError } from '@/shared/utils/ApiError';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import * as analysisService from '@/modules/analysis/analysis.service';
import { extractTextFromFile } from '@/modules/analysis/engine/fileTextExtractor';
import { extractUrlContent } from '@/modules/analysis/engine/urlContentExtractor';
import { publicAnalysisBodySchema } from '@/modules/analysis/analysis.validation';

// Guest/anonymous entry point — no auth, IP rate-limited, multipart so it
// can accept a file upload alongside url/description. Same behavior as the
// original analyzePublic controller; only the multipart-parsing mechanism
// changed (native FormData via parseUploadedFile, replacing multer).
// Early, coarse rejection before the multipart body is even read — the
// authoritative check stays in parseUploadedFile.ts (below), which measures
// the actual parsed file. Content-Length is only what the client *claims*
// it's sending (absent for chunked transfer-encoding, and this is the whole
// multipart body — form fields and boundaries included, not just the file
// — hence the added overhead allowance), so this is a defense-in-depth
// early exit, not a substitute for the real, exact post-parse limit.
const MULTIPART_OVERHEAD_ALLOWANCE_BYTES = 64 * 1024;

export const POST = apiHandler(
  async (request: NextRequest) => {
    await checkPublicAnalysisRateLimit(getClientIp(request));

    const declaredSize = Number(request.headers.get('content-length'));
    const maxRequestBytes =
      env.PUBLIC_ANALYSIS_MAX_FILE_SIZE_MB * 1024 * 1024 + MULTIPART_OVERHEAD_ALLOWANCE_BYTES;
    if (Number.isFinite(declaredSize) && declaredSize > maxRequestBytes) {
      throw new ApiError(413, 'Uploaded file is too large.');
    }

    await connectDB();

    const formData = await request.formData();
    const { url, description } = validateData(publicAnalysisBodySchema, {
      url: formData.get('url') ?? undefined,
      description: formData.get('description') ?? undefined,
    });
    const file = await parseUploadedFile(formData);

    if (!url && !description && !file) {
      throw new ApiError(400, 'Provide at least one of: url, description, or file.');
    }

    let fileSource: analysisService.PublicAnalysisSource['file'];
    if (file) {
      const extractedText = await extractTextFromFile(file.buffer, file.fileType).catch(() => {
        throw new ApiError(
          400,
          'Could not read the uploaded file. Make sure it is a valid PDF, DOC, DOCX, or TXT file.',
        );
      });

      if (!extractedText.trim()) {
        throw new ApiError(400, 'Could not extract any readable text from the uploaded file.');
      }

      fileSource = { originalName: file.originalName, extractedText };
    }

    let urlExtractedText: string | undefined;
    let urlExtractionError: string | null = null;
    if (url) {
      const extraction = await extractUrlContent(url);
      if (extraction.metadata.success) {
        urlExtractedText = extraction.extractedText;
      } else {
        urlExtractionError = `Unable to read webpage content. Analysis was performed using available information only. (${extraction.metadata.error})`;
      }

      if (env.isDevelopment) {
        logger.debug(
          {
            requestedUrl: url,
            extractionSuccess: extraction.metadata.success,
            extractionError: extraction.metadata.error,
            statusCode: extraction.metadata.statusCode,
            contentType: extraction.metadata.contentType,
            extractedTextLength: extraction.extractedText.length,
            extractedTextPreview: extraction.extractedText.slice(0, 200),
          },
          'urlContentExtractor result',
        );
      }
    }

    const result = await analysisService.createPublicAnalysis({
      url,
      urlExtractedText,
      urlExtractionError,
      description,
      file: fileSource,
    });

    return NextResponse.json(successBody(result), { status: 201 });
  },
  { public: true },
);
