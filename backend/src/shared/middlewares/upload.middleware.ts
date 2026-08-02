import multer from 'multer';
import { env } from '@/config/env';
import { resolveFileType } from '@/modules/analysis/engine/fileTextExtractor';
import { ApiError } from '@/shared/utils/ApiError';

export const uploadAnalysisFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.PUBLIC_ANALYSIS_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!resolveFileType(file.mimetype, file.originalname)) {
      callback(new ApiError(400, 'Unsupported file type. Supported formats: PDF, DOC, DOCX, TXT.'));
      return;
    }
    callback(null, true);
  },
}).single('file');
