import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '@/config/env';
import { parseUploadedFile } from '@/lib/parseUploadedFile';
import { ApiError } from '@/shared/utils/ApiError';

function formDataWithFile(name: string, type: string, contents: string): FormData {
  const formData = new FormData();
  formData.set('file', new File([contents], name, { type }));
  return formData;
}

test('returns undefined when no file field is present', async () => {
  const formData = new FormData();
  const result = await parseUploadedFile(formData);
  assert.equal(result, undefined);
});

test('accepts a plain text file and returns its buffer/type/name', async () => {
  const formData = formDataWithFile('posting.txt', 'text/plain', 'Software Engineer job posting.');
  const result = await parseUploadedFile(formData);
  assert.ok(result);
  assert.equal(result.originalName, 'posting.txt');
  assert.equal(result.mimetype, 'text/plain');
  assert.equal(result.fileType, 'txt');
  assert.equal(result.buffer.toString('utf8'), 'Software Engineer job posting.');
});

test('accepts a PDF by mimetype', async () => {
  const formData = formDataWithFile('posting.pdf', 'application/pdf', '%PDF-1.4 fake');
  const result = await parseUploadedFile(formData);
  assert.ok(result);
  assert.equal(result.fileType, 'pdf');
});

test('rejects an unsupported mimetype/extension with a 400 ApiError', async () => {
  const formData = formDataWithFile('posting.exe', 'application/x-msdownload', 'binary');
  await assert.rejects(
    () => parseUploadedFile(formData),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 400);
      return true;
    },
  );
});

test('rejects a file larger than PUBLIC_ANALYSIS_MAX_FILE_SIZE_MB with a 400 ApiError', async () => {
  const maxBytes = env.PUBLIC_ANALYSIS_MAX_FILE_SIZE_MB * 1024 * 1024;
  const oversized = new Uint8Array(maxBytes + 1);
  const formData = new FormData();
  formData.set('file', new File([oversized], 'huge.txt', { type: 'text/plain' }));
  await assert.rejects(
    () => parseUploadedFile(formData),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 400);
      return true;
    },
  );
});

test('rejects a non-File value in the file field with a 400 ApiError', async () => {
  const formData = new FormData();
  formData.set('file', 'not-a-file');
  await assert.rejects(
    () => parseUploadedFile(formData),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 400);
      return true;
    },
  );
});
