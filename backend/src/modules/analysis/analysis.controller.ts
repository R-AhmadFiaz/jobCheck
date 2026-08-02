import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { sendSuccess } from '@/shared/utils/ApiResponse';
import { ApiError } from '@/shared/utils/ApiError';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import * as analysisService from '@/modules/analysis/analysis.service';
import { extractTextFromFile, resolveFileType } from '@/modules/analysis/engine/fileTextExtractor';
import { extractUrlContent } from '@/modules/analysis/engine/urlContentExtractor';
import type {
  CreateAnalysisInput,
  ListAnalysesQuery,
  PublicAnalysisBody,
} from '@/modules/analysis/analysis.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateAnalysisInput;
  const result = await analysisService.createAnalysis(req.user!.userId, input);
  sendSuccess(res, 201, result);
});

export const analyzePublic = asyncHandler(async (req: Request, res: Response) => {
  const { url, description } = req.body as PublicAnalysisBody;
  const file = req.file;

  if (!url && !description && !file) {
    throw new ApiError(400, 'Provide at least one of: url, description, or file.');
  }

  let fileSource: analysisService.PublicAnalysisSource['file'];
  if (file) {
    // multer's fileFilter already rejected unsupported types before this
    // handler runs — resolveFileType here is dispatch (which parser to use),
    // not a second validation pass.
    const fileType = resolveFileType(file.mimetype, file.originalname);
    if (!fileType) {
      throw new ApiError(400, 'Unsupported file type. Supported formats: PDF, DOC, DOCX, TXT.');
    }

    const extractedText = await extractTextFromFile(file.buffer, fileType).catch(() => {
      throw new ApiError(
        400,
        'Could not read the uploaded file. Make sure it is a valid PDF, DOC, DOCX, or TXT file.',
      );
    });

    if (!extractedText.trim()) {
      throw new ApiError(400, 'Could not extract any readable text from the uploaded file.');
    }

    fileSource = { originalName: file.originalname, extractedText };
  }

  // Input-preparation stage for the url source: fetch + parse the page here,
  // before anything reaches the analysis service. A failed fetch never fails
  // the whole request — it degrades to whatever other input was given, with
  // the failure recorded so the user isn't shown a silently-shallow result.
  let urlExtractedText: string | undefined;
  let urlExtractionError: string | null = null;
  if (url) {
    const extraction = await extractUrlContent(url);
    if (extraction.metadata.success) {
      urlExtractedText = extraction.extractedText;
    } else {
      urlExtractionError = `Unable to read webpage content. Analysis was performed using available information only. (${extraction.metadata.error})`;
    }

    // TEMPORARY debug output (dev-only, gated on env.isDevelopment — never
    // logs page content in production) — added to diagnose why different
    // URLs were producing near-identical risk scores. Remove once resolved.
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
  sendSuccess(res, 201, result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await analysisService.getAnalysisById(req.params.id!, req.user ?? null);
  sendSuccess(res, 200, result);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as ListAnalysesQuery;
  const result = await analysisService.getAnalysisHistory(req.user!.userId, page, limit);
  sendSuccess(res, 200, result);
});
