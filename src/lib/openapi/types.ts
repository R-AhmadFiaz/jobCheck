// Minimal, hand-rolled OpenAPI 3.0 typings — just the subset this project's
// spec (src/lib/openapi/spec.ts) actually uses. Deliberately not the
// `openapi-types` package: this API surface is small and fixed (15 routes),
// so a full third-party typings dependency isn't earning its place — these
// ~10 interfaces are enough to keep the hand-written spec fully typed and
// catch real mistakes (typos in field names, wrong nesting) at compile time.

export interface SchemaObject {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
  format?: string;
  description?: string;
  example?: unknown;
  enum?: readonly (string | number | boolean | null)[];
  nullable?: boolean;
  properties?: Record<string, SchemaObject>;
  required?: readonly string[];
  items?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  oneOf?: readonly SchemaObject[];
  discriminator?: { propertyName: string };
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
  $ref?: string;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: SchemaObject;
}

export interface MediaTypeObject {
  schema: SchemaObject;
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

export interface OperationObject {
  summary: string;
  description?: string;
  tags?: readonly string[];
  operationId?: string;
  security?: readonly Record<string, readonly string[]>[];
  parameters?: readonly ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
}

export type PathItemObject = Partial<
  Record<'get' | 'post' | 'patch' | 'put' | 'delete', OperationObject>
>;

export interface SecuritySchemeObject {
  type: 'http' | 'apiKey';
  scheme?: 'bearer';
  bearerFormat?: string;
  in?: 'cookie' | 'header' | 'query';
  name?: string;
  description?: string;
}

export interface OpenApiDocument {
  openapi: '3.0.3';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: readonly { url: string; description?: string }[];
  tags?: readonly { name: string; description?: string }[];
  security?: readonly Record<string, readonly string[]>[];
  components: {
    securitySchemes: Record<string, SecuritySchemeObject>;
    schemas: Record<string, SchemaObject>;
  };
  paths: Record<string, PathItemObject>;
}
