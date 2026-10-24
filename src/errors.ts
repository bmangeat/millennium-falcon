/** Error carrying everything needed to build an HTTP error response. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class NotImplementedError extends AppError {
  constructor(message = 'Not implemented') {
    super(501, 'NOT_IMPLEMENTED', message);
  }
}

/** Raised at startup when configuration or reference data is unusable (never sent over HTTP). */
export class ConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigError';
  }
}
