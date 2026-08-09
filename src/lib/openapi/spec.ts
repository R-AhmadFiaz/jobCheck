import type { OpenApiDocument, ParameterObject, ResponseObject, SchemaObject } from '@/lib/openapi/types';

// Hand-maintained, not generated — see the earlier planning discussion for
// why: this API has 15 fixed routes, and the third-party Zod→OpenAPI
// generators available for Zod v4 (the version this project uses) don't
// have confirmed compatibility, so generating from src/modules/**/*.validation.ts
// would be an unverified dependency risk for a surface this size. Every
// path/parameter/schema below was read directly from the actual route
// handlers and their Zod schemas, not inferred or assumed — see the
// route-by-route audit this was built from.
//
// Kept deliberately separate from the app's runtime request/response code:
// this file is documentation, and must never become something the actual
// routes import from or depend on (that would risk the docs silently
// drifting from reality in the opposite, more dangerous direction — code
// bending to match stale docs instead of docs describing real code).

// ─── Reusable component schemas ────────────────────────────────────────────

const errorResponseSchema: SchemaObject = {
  type: 'object',
  properties: {
    success: { type: 'boolean', enum: [false] },
    error: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  },
  required: ['success', 'error'],
};

function successOf(dataSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: dataSchema,
    },
    required: ['success', 'data'],
  };
}

const userSchema: SchemaObject = {
  type: 'object',
  description: "A user account. `passwordHash` is never included — the User model's toJSON transform strips it unconditionally.",
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['user', 'admin'] },
    plan: { type: 'string', enum: ['free', 'premium'] },
    isVerified: { type: 'boolean' },
    isBanned: { type: 'boolean' },
    lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['_id', 'name', 'email', 'role', 'plan', 'isVerified', 'isBanned', 'createdAt', 'updatedAt'],
};

const extractedFieldsSchema: SchemaObject = {
  type: 'object',
  properties: {
    companyName: { type: 'string', nullable: true },
    jobTitle: { type: 'string', nullable: true },
    salaryRange: { type: 'string', nullable: true },
    contactEmail: { type: 'string', nullable: true },
    contactPhone: { type: 'string', nullable: true },
    location: { type: 'string', nullable: true },
  },
};

const redFlagSchema: SchemaObject = {
  type: 'object',
  properties: {
    ruleId: { type: 'string' },
    label: { type: 'string', description: 'The ScamRule.key that matched, or a correlation-layer key (e.g. ANONYMOUS_EMPLOYER_PAYMENT_PATTERN).' },
    description: { type: 'string' },
    weight: { type: 'number' },
    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['ruleId', 'label', 'description', 'weight', 'severity'],
};

const greenFlagSchema: SchemaObject = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['label', 'description'],
};

const jobAnalysisSchema: SchemaObject = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    userId: { type: 'string', nullable: true, description: 'null for a guest/anonymous submission.' },
    rawJobText: { type: 'string' },
    normalizedText: { type: 'string' },
    extractedFields: extractedFieldsSchema,
    companyId: { type: 'string', nullable: true },
    riskScore: { type: 'number', minimum: 0, maximum: 100 },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    redFlags: { type: 'array', items: redFlagSchema },
    greenFlags: { type: 'array', items: greenFlagSchema },
    aiExplanation: { type: 'string', nullable: true },
    aiConfidence: { type: 'number', nullable: true, minimum: 0, maximum: 1 },
    engineVersion: { type: 'string' },
    isSaved: { type: 'boolean' },
    sourceMetadata: {
      type: 'object',
      nullable: true,
      properties: {
        url: { type: 'string', nullable: true },
        hasDescription: { type: 'boolean' },
        fileName: { type: 'string', nullable: true },
        urlExtractionError: { type: 'string', nullable: true },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['_id', 'rawJobText', 'normalizedText', 'riskScore', 'riskLevel', 'engineVersion', 'createdAt'],
};

const analysisWithStatusSchema: SchemaObject = {
  type: 'object',
  properties: {
    analysis: jobAnalysisSchema,
    status: { type: 'string', enum: ['pending', 'evaluated'] },
  },
  required: ['analysis', 'status'],
};

const publicReportSchema: SchemaObject = {
  type: 'object',
  description: 'A redacted, always-public view of an analysis (the "Share Report" link). Deliberately narrower than the full analysis: no rawJobText/normalizedText/contact fields/userId.',
  properties: {
    id: { type: 'string' },
    riskScore: { type: 'number', minimum: 0, maximum: 100 },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    redFlags: { type: 'array', items: redFlagSchema },
    greenFlags: { type: 'array', items: greenFlagSchema },
    aiExplanation: { type: 'string', nullable: true },
    aiConfidence: { type: 'number', nullable: true },
    engineVersion: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    jobTitle: { type: 'string', nullable: true },
    companyName: { type: 'string', nullable: true },
  },
  required: ['id', 'riskScore', 'riskLevel', 'engineVersion', 'createdAt'],
};

function paginatedOf(itemsSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    properties: {
      items: { type: 'array', items: itemsSchema },
      page: { type: 'integer' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
    },
    required: ['items', 'page', 'limit', 'total', 'totalPages'],
  };
}

const matcherSchema: SchemaObject = {
  description: 'One of four matcher shapes, discriminated by `type` — must match one ruleEngine.ts can evaluate.',
  oneOf: [
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['keyword'] },
        keywords: { type: 'array', items: { type: 'string' } },
        weakKeywords: { type: 'array', items: { type: 'string' } },
        contextKeywords: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string' },
      },
      required: ['type', 'keywords', 'recommendation'],
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['regex'] },
        pattern: { type: 'string' },
        flags: { type: 'string' },
        recommendation: { type: 'string' },
      },
      required: ['type', 'pattern', 'recommendation'],
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['emailDomain'] },
        genericDomains: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string' },
      },
      required: ['type', 'genericDomains', 'recommendation'],
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['fieldPresence'] },
        requiredField: {
          type: 'string',
          enum: ['companyName', 'jobTitle', 'salaryRange', 'contactEmail', 'contactPhone', 'location'],
        },
        recommendation: { type: 'string' },
      },
      required: ['type', 'requiredField', 'recommendation'],
    },
  ],
};

const scamRuleSchema: SchemaObject = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    key: { type: 'string' },
    description: { type: 'string' },
    category: { type: 'string' },
    matcher: matcherSchema,
    weight: { type: 'number', minimum: 0, maximum: 100 },
    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['_id', 'key', 'description', 'category', 'matcher', 'weight', 'severity', 'isActive'],
};

const knowledgeCommunityReportSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    category: { type: 'string' },
    description: { type: 'string' },
    reportedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'category', 'description', 'reportedAt'],
};

// Matches KnowledgeEntryDTO (knowledgeBase.service.ts's toDTO()) — the shape
// every knowledge-base route actually returns — not the raw Mongoose model
// (IKnowledgeBaseEntry), which uses different field names/enums entirely
// (entityType/identifier/'low'..'critical' vs this DTO's type/domain/
// 'safe'..'confirmed_scam'). The service translates one to the other.
const knowledgeBaseEntrySchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['company', 'recruiter', 'domain'] },
    name: { type: 'string' },
    trustScore: { type: 'number', minimum: 0, maximum: 100 },
    riskLevel: { type: 'string', enum: ['safe', 'suspicious', 'high_risk', 'confirmed_scam'] },
    description: { type: 'string' },
    indicators: { type: 'array', items: { type: 'string' } },
    communityReports: { type: 'array', items: knowledgeCommunityReportSchema },
    verificationStatus: { type: 'string', enum: ['unverified', 'community_verified', 'admin_verified'] },
    createdAt: { type: 'string', format: 'date-time' },
    domain: { type: 'string', nullable: true },
    associatedCompany: { type: 'string', nullable: true },
  },
  required: ['id', 'type', 'name', 'trustScore', 'riskLevel', 'description', 'indicators', 'communityReports', 'verificationStatus', 'createdAt'],
};

// ─── Reusable parameters / responses ───────────────────────────────────────

const pageParam: ParameterObject = {
  name: 'page',
  in: 'query',
  required: false,
  schema: { type: 'integer', minimum: 1, default: 1 },
};

function limitParam(max: number, def: number): ParameterObject {
  return {
    name: 'limit',
    in: 'query',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: max, default: def },
  };
}

const idPathParam: ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', description: '24-character hex Mongo ObjectId.' },
};

const err400: ResponseObject = { description: 'Validation failed.', content: { 'application/json': { schema: errorResponseSchema } } };
const err401: ResponseObject = { description: 'Missing or invalid access token.', content: { 'application/json': { schema: errorResponseSchema } } };
const err403: ResponseObject = { description: 'Authenticated, but not permitted (wrong role, or not the resource owner).', content: { 'application/json': { schema: errorResponseSchema } } };
const err404: ResponseObject = { description: 'Not found.', content: { 'application/json': { schema: errorResponseSchema } } };
const err429: ResponseObject = { description: 'Rate limit exceeded.', content: { 'application/json': { schema: errorResponseSchema } } };

const bearerAuth = [{ bearerAuth: [] }];

// ─── Document ───────────────────────────────────────────────────────────────

export const openApiSpec: OpenApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'JobCheck API',
    version: '1.0.0',
    description:
      'Job-posting scam-detection API. Every response is one of two envelopes: `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message": ... } }`. This document is hand-maintained directly from the Route Handlers and Zod schemas in src/app/api/v1/** and src/modules/**/*.validation.ts — admin-only, not for external distribution.',
  },
  servers: [{ url: '/api/v1', description: 'Same-origin — this app serves both the UI and the API.' }],
  tags: [
    { name: 'Auth' },
    { name: 'Analysis' },
    { name: 'Admin' },
    { name: 'Knowledge Base' },
    { name: 'Health' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Short-lived access token, returned in the response body by register/login/refresh. Sent as `Authorization: Bearer <token>`. Never stored in a cookie or localStorage by the app itself.',
      },
      refreshTokenCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'Opaque, httpOnly, Secure(prod), SameSite=strict cookie, scoped to /api/v1/auth. Set by register/login/refresh; rotated on every refresh; cleared on logout. Never readable by JavaScript — the browser sends it automatically.',
      },
    },
    schemas: {
      User: userSchema,
      JobAnalysis: jobAnalysisSchema,
      AnalysisWithStatus: analysisWithStatusSchema,
      PublicReport: publicReportSchema,
      ScamRule: scamRuleSchema,
      KnowledgeBaseEntry: knowledgeBaseEntrySchema,
      ErrorResponse: errorResponseSchema,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        description: 'Fully public. `uptimeSeconds` is meaningless per-invocation on serverless (documented, not fixed).',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: successOf({
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok'] },
                    environment: { type: 'string' },
                    uptimeSeconds: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' },
                    db: { type: 'string', enum: ['disconnected', 'connected', 'connecting', 'disconnecting'] },
                  },
                }),
              },
            },
          },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        description: 'Public, IP rate-limited. Sets the refreshToken cookie on success.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Account created.',
            content: { 'application/json': { schema: successOf({ type: 'object', properties: { user: userSchema, accessToken: { type: 'string' } }, required: ['user', 'accessToken'] }) } },
          },
          '400': err400,
          '409': { description: 'An account with this email already exists.', content: { 'application/json': { schema: errorResponseSchema } } },
          '429': err429,
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        description: 'Public, IP rate-limited. Sets the refreshToken cookie on success.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 1 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Signed in.',
            content: { 'application/json': { schema: successOf({ type: 'object', properties: { user: userSchema, accessToken: { type: 'string' } }, required: ['user', 'accessToken'] }) } },
          },
          '400': err400,
          '401': { description: 'Invalid email or password.', content: { 'application/json': { schema: errorResponseSchema } } },
          '403': { description: 'Account is banned.', content: { 'application/json': { schema: errorResponseSchema } } },
          '429': err429,
        },
      },
    },

    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange the refresh cookie for a new access token',
        description: 'No Authorization header needed — reads the refreshToken cookie. Rotates the cookie on every call; reuse of an already-rotated token revokes all active sessions for that user.',
        security: [{ refreshTokenCookie: [] }],
        responses: {
          '200': {
            description: 'New access token issued; cookie rotated.',
            content: { 'application/json': { schema: successOf({ type: 'object', properties: { accessToken: { type: 'string' } }, required: ['accessToken'] }) } },
          },
          '401': { description: 'Missing, invalid, expired, or reused refresh token.', content: { 'application/json': { schema: errorResponseSchema } } },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out',
        description: 'Revokes the current refresh token (if any) and clears the cookie. Always succeeds, even with no cookie present.',
        security: [{ refreshTokenCookie: [] }],
        responses: {
          '200': {
            description: 'Logged out.',
            content: { 'application/json': { schema: successOf({ type: 'object', properties: { message: { type: 'string' } } }) } },
          },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current user',
        security: bearerAuth,
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: successOf({ type: 'object', properties: { user: userSchema }, required: ['user'] }) } } },
          '401': err401,
        },
      },
    },

    '/analyze/public': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze a job posting anonymously',
        description: 'No auth. IP rate-limited (checkPublicAnalysisRateLimit). At least one of url, description, or file must be provided. Result is not tied to any account.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'http(s) URL to fetch and analyze, max 2048 chars.' },
                  description: { type: 'string', maxLength: 20000 },
                  file: { type: 'string', format: 'binary', description: 'PDF, DOC, DOCX, or TXT.' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Analyzed.',
            content: { 'application/json': { schema: successOf(analysisWithStatusSchema) } },
          },
          '400': { description: 'No usable content provided, or the uploaded file could not be read.', content: { 'application/json': { schema: errorResponseSchema } } },
          '413': { description: 'Uploaded file/request body too large.', content: { 'application/json': { schema: errorResponseSchema } } },
          '429': err429,
        },
      },
    },

    '/analyses': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze a job posting (authenticated, saved to history)',
        description: 'Exactly one of jobText or jobUrl must be provided. Per-account rate limit.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jobText: { type: 'string', minLength: 20, maxLength: 20000 },
                  jobUrl: { type: 'string', maxLength: 2048 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Analyzed and saved.', content: { 'application/json': { schema: successOf(analysisWithStatusSchema) } } },
          '400': err400,
          '401': err401,
          '429': err429,
        },
      },
      get: {
        tags: ['Analysis'],
        summary: "List the current user's analysis history",
        security: bearerAuth,
        parameters: [pageParam, limitParam(50, 10)],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: successOf(paginatedOf(analysisWithStatusSchema)) } } },
          '401': err401,
        },
      },
    },

    '/analyses/{id}': {
      get: {
        tags: ['Analysis'],
        summary: 'Get one analysis by id',
        description: 'Auth optional: guest-run analyses (userId: null) are viewable by anyone; owned analyses require the owner or an admin.',
        security: [...bearerAuth, {}],
        parameters: [idPathParam],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: successOf(analysisWithStatusSchema) } } },
          '403': { description: 'Not the owner of this analysis.', content: { 'application/json': { schema: errorResponseSchema } } },
          '404': err404,
        },
      },
    },

    '/reports/{id}': {
      get: {
        tags: ['Analysis'],
        summary: 'Get the redacted public report for an analysis (Share Report link)',
        description: 'Fully public — no auth, no ownership check. Works for any analysis id.',
        parameters: [idPathParam],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: successOf({ type: 'object', properties: { report: publicReportSchema }, required: ['report'] }) } } },
          '404': err404,
        },
      },
    },

    '/admin/scam-rules': {
      get: {
        tags: ['Admin'],
        summary: 'List scam-detection rules',
        security: bearerAuth,
        parameters: [
          { name: 'isActive', in: 'query', required: false, schema: { type: 'boolean' } },
          { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'severity', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
          pageParam,
          limitParam(100, 20),
          { name: 'sortBy', in: 'query', required: false, schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'weight', 'key', 'category', 'severity'], default: 'createdAt' } },
          { name: 'sortOrder', in: 'query', required: false, schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: successOf(paginatedOf(scamRuleSchema)) } } },
          '401': err401,
          '403': err403,
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a scam-detection rule',
        description: '`key` is normalized to uppercase server-side before the uniqueness check.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string', minLength: 2, maxLength: 100 },
                  description: { type: 'string', minLength: 5, maxLength: 1000 },
                  category: { type: 'string', minLength: 2, maxLength: 50 },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  weight: { type: 'number', minimum: 0, maximum: 100 },
                  matcher: matcherSchema,
                  isActive: { type: 'boolean', default: true },
                },
                required: ['key', 'description', 'category', 'severity', 'weight', 'matcher'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created.', content: { 'application/json': { schema: successOf({ type: 'object', properties: { rule: scamRuleSchema }, required: ['rule'] }) } } },
          '400': err400,
          '401': err401,
          '403': err403,
          '409': { description: 'A rule with this key already exists.', content: { 'application/json': { schema: errorResponseSchema } } },
        },
      },
    },

    '/admin/scam-rules/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a scam-detection rule',
        description: 'At least one field required. Any subset of the create fields except `key`, which is immutable.',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  description: { type: 'string', minLength: 5, maxLength: 1000 },
                  category: { type: 'string', minLength: 2, maxLength: 50 },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  weight: { type: 'number', minimum: 0, maximum: 100 },
                  matcher: matcherSchema,
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated.', content: { 'application/json': { schema: successOf({ type: 'object', properties: { rule: scamRuleSchema }, required: ['rule'] }) } } },
          '400': err400,
          '401': err401,
          '403': err403,
          '404': err404,
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a scam-detection rule',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: {
          '200': { description: 'Deleted.', content: { 'application/json': { schema: successOf({ type: 'object', properties: { message: { type: 'string' } } }) } } },
          '401': err401,
          '403': err403,
          '404': err404,
        },
      },
    },

    '/knowledge-base': {
      get: {
        tags: ['Knowledge Base'],
        summary: 'List knowledge-base entries',
        description: 'Any authenticated role (not admin-only).',
        security: bearerAuth,
        parameters: [
          { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['company', 'recruiter', 'domain'] } },
          { name: 'riskLevel', in: 'query', required: false, schema: { type: 'string', enum: ['safe', 'suspicious', 'high_risk', 'confirmed_scam'] } },
          { name: 'verificationStatus', in: 'query', required: false, schema: { type: 'string', enum: ['unverified', 'community_verified', 'admin_verified'] } },
          pageParam,
          limitParam(50, 20),
        ],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: successOf(paginatedOf(knowledgeBaseEntrySchema)) } } },
          '401': err401,
        },
      },
      post: {
        tags: ['Knowledge Base'],
        summary: 'Create a knowledge-base entry',
        description: 'Admin only.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['company', 'recruiter', 'domain'] },
                  name: { type: 'string', minLength: 2, maxLength: 200 },
                  description: { type: 'string', minLength: 5, maxLength: 2000 },
                  trustScore: { type: 'number', minimum: 0, maximum: 100 },
                  riskLevel: { type: 'string', enum: ['safe', 'suspicious', 'high_risk', 'confirmed_scam'] },
                  indicators: { type: 'array', items: { type: 'string', maxLength: 200 }, default: [] },
                  verificationStatus: { type: 'string', enum: ['unverified', 'community_verified', 'admin_verified'], default: 'unverified' },
                  domain: { type: 'string', maxLength: 255 },
                  associatedCompany: { type: 'string', maxLength: 200 },
                },
                required: ['type', 'name', 'description', 'trustScore', 'riskLevel'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created.', content: { 'application/json': { schema: successOf({ type: 'object', properties: { entry: knowledgeBaseEntrySchema }, required: ['entry'] }) } } },
          '400': err400,
          '401': err401,
          '403': err403,
          '409': { description: 'A knowledge base entry with this name already exists.', content: { 'application/json': { schema: errorResponseSchema } } },
        },
      },
    },

    '/knowledge-base/{id}': {
      get: {
        tags: ['Knowledge Base'],
        summary: 'Get one knowledge-base entry',
        security: bearerAuth,
        parameters: [idPathParam],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: successOf({ type: 'object', properties: { entry: knowledgeBaseEntrySchema }, required: ['entry'] }) } } },
          '401': err401,
          '404': err404,
        },
      },
      patch: {
        tags: ['Knowledge Base'],
        summary: 'Update a knowledge-base entry',
        description: 'Admin only. At least one field required.',
        security: bearerAuth,
        parameters: [idPathParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  description: { type: 'string', minLength: 5, maxLength: 2000 },
                  trustScore: { type: 'number', minimum: 0, maximum: 100 },
                  riskLevel: { type: 'string', enum: ['safe', 'suspicious', 'high_risk', 'confirmed_scam'] },
                  indicators: { type: 'array', items: { type: 'string', maxLength: 200 } },
                  verificationStatus: { type: 'string', enum: ['unverified', 'community_verified', 'admin_verified'] },
                  domain: { type: 'string', maxLength: 255 },
                  associatedCompany: { type: 'string', maxLength: 200 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated.', content: { 'application/json': { schema: successOf({ type: 'object', properties: { entry: knowledgeBaseEntrySchema }, required: ['entry'] }) } } },
          '400': err400,
          '401': err401,
          '403': err403,
          '404': err404,
        },
      },
    },

    '/knowledge-base/search': {
      get: {
        tags: ['Knowledge Base'],
        summary: 'Search knowledge-base entries',
        description: 'Not paginated — returns up to 50 matches, riskiest first.',
        security: bearerAuth,
        parameters: [
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['company', 'recruiter', 'domain'] } },
          { name: 'q', in: 'query', required: false, schema: { type: 'string', maxLength: 200, default: '' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: successOf({
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    type: { type: 'string', enum: ['company', 'recruiter', 'domain'] },
                    items: { type: 'array', items: knowledgeBaseEntrySchema },
                  },
                  required: ['query', 'type', 'items'],
                }),
              },
            },
          },
          '400': err400,
          '401': err401,
        },
      },
    },
  },
};
