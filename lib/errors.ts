/**
 * Error handling utilities for API routes
 */

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

/**
 * Sanitizes error details for API responses
 * In production: hides internal details
 * In development: shows full error message
 */
export function sanitizeError(error: unknown): ApiError {
  // Log the full error for debugging
  console.error('Internal error:', error);

  if (process.env.NODE_ENV === 'production') {
    // In production, don't expose internal error details
    return {
      message: 'An unexpected error occurred',
      status: 500,
    };
  }

  // In development, return more details for debugging
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      status: 500,
    };
  }

  return {
    message: String(error),
    status: 500,
  };
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string = 'APP_ERROR', status: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Docker-specific error
 */
export class DockerError extends AppError {
  constructor(message: string, code: string = 'DOCKER_ERROR') {
    super(message, code, 500);
    this.name = 'DockerError';
  }
}

/**
 * Container not found error
 */
export class ContainerNotFoundError extends AppError {
  constructor(containerId: string) {
    super(`Container ${containerId} not found`, 'CONTAINER_NOT_FOUND', 404);
    this.name = 'ContainerNotFoundError';
  }
}

/**
 * Validation error for bad user input
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.fields && { fields: error.fields }),
      },
      { status: error.status }
    );
  }

  const sanitized = sanitizeError(error);
  return Response.json(
    { success: false, error: sanitized.message, code: sanitized.code },
    { status: sanitized.status }
  );
}
