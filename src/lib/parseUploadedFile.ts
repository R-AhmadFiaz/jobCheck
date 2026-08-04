import { ApiError } from '@/shared/utils/ApiError';
import { env } from '@/config/env';
import { resolveFileType, type SupportedFileType } from '@/modules/analysis/engine/fileTextExtractor';

export interface ParsedUploadedFile {
  originalName: string;
  mimetype: string;
  buffer: Buffer;
  fileType: SupportedFileType;
}

/**
 * Next.js migration: replaces upload.middleware.ts's multer instance
 * (memoryStorage + fileSize limit + fileFilter) — Route Handlers have no
 * Express middleware chain to hang multer off of. Reads the `file` field
 * from a Web FormData object (the caller already awaited
 * `request.formData()`), and replicates the exact same checks multer
 * enforced: same size limit (`PUBLIC_ANALYSIS_MAX_FILE_SIZE_MB`), same
 * type check via the unchanged `resolveFileType`, same ApiError
 * messages/status codes. Returns `undefined` if no file was provided —
 * the caller decides whether that's acceptable (url/description are
 * alternative sources), same as before.
 */
export async function parseUploadedFile(
  formData: FormData,
): Promise<ParsedUploadedFile | undefined> {
  const entry = formData.get('file');
  if (entry === null) return undefined;

  if (!(entry instanceof File)) {
    throw new ApiError(400, 'Unsupported file type. Supported formats: PDF, DOC, DOCX, TXT.');
  }

  const maxBytes = env.PUBLIC_ANALYSIS_MAX_FILE_SIZE_MB * 1024 * 1024;
  if (entry.size > maxBytes) {
    throw new ApiError(400, 'Uploaded file is too large.');
  }

  const fileType = resolveFileType(entry.type, entry.name);
  if (!fileType) {
    throw new ApiError(400, 'Unsupported file type. Supported formats: PDF, DOC, DOCX, TXT.');
  }

  const buffer = Buffer.from(await entry.arrayBuffer());
  return { originalName: entry.name, mimetype: entry.type, buffer, fileType };
}
