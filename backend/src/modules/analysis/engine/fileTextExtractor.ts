import mammoth from 'mammoth';
// No type declarations ship for these two — both are small, stable CJS libraries.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WordExtractor = require('word-extractor') as new () => {
  extract: (buffer: Buffer) => Promise<{ getBody: () => string }>;
};

export type SupportedFileType = 'pdf' | 'doc' | 'docx' | 'txt';

const FILE_TYPE_BY_MIME: Record<string, SupportedFileType> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

const FILE_TYPE_BY_EXTENSION: Record<string, SupportedFileType> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  txt: 'txt',
};

/**
 * Browsers/OSes are inconsistent about the mimetype they attach to .doc/.docx
 * uploads, so the file extension is checked as a fallback rather than trusted
 * mimetype alone.
 */
export function resolveFileType(mimetype: string, originalName: string): SupportedFileType | null {
  if (FILE_TYPE_BY_MIME[mimetype]) {
    return FILE_TYPE_BY_MIME[mimetype];
  }
  const extension = originalName.split('.').pop()?.toLowerCase();
  return extension ? (FILE_TYPE_BY_EXTENSION[extension] ?? null) : null;
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileType: SupportedFileType,
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return (await pdfParse(buffer)).text;
    case 'docx':
      return (await mammoth.extractRawText({ buffer })).value;
    case 'doc':
      return (await new WordExtractor().extract(buffer)).getBody();
    case 'txt':
      return buffer.toString('utf-8');
  }
}
