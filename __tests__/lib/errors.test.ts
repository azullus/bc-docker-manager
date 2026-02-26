import {
  sanitizeError,
  AppError,
  DockerError,
  ContainerNotFoundError,
  ValidationError,
  createErrorResponse,
} from '@/lib/errors';

describe('Error Utilities', () => {
  describe('sanitizeError', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalConsoleError = console.error;

    beforeEach(() => {
      console.error = jest.fn();
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });

    it('should return generic message in production', () => {
      process.env.NODE_ENV = 'production';
      const result = sanitizeError(new Error('Internal database error'));

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.status).toBe(500);
    });

    it('should return detailed message in development', () => {
      process.env.NODE_ENV = 'development';
      const result = sanitizeError(new Error('Internal database error'));

      expect(result.message).toBe('Internal database error');
      expect(result.code).toBe('Error');
      expect(result.status).toBe(500);
    });

    it('should handle non-Error objects in development', () => {
      process.env.NODE_ENV = 'development';
      const result = sanitizeError('string error');

      expect(result.message).toBe('string error');
      expect(result.status).toBe(500);
    });

    it('should log the full error', () => {
      const error = new Error('test');
      sanitizeError(error);

      expect(console.error).toHaveBeenCalledWith('Internal error:', error);
    });
  });

  describe('AppError', () => {
    it('should create an error with default values', () => {
      const error = new AppError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('APP_ERROR');
      expect(error.status).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('should create an error with custom code and status', () => {
      const error = new AppError('Not authorized', 'AUTH_ERROR', 401);

      expect(error.message).toBe('Not authorized');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.status).toBe(401);
    });

    it('should be an instance of Error', () => {
      const error = new AppError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('DockerError', () => {
    it('should create a Docker error with defaults', () => {
      const error = new DockerError('Docker daemon not running');

      expect(error.message).toBe('Docker daemon not running');
      expect(error.code).toBe('DOCKER_ERROR');
      expect(error.status).toBe(500);
      expect(error.name).toBe('DockerError');
    });

    it('should create a Docker error with custom code', () => {
      const error = new DockerError('Connection refused', 'DOCKER_CONN_ERROR');

      expect(error.code).toBe('DOCKER_CONN_ERROR');
    });

    it('should be an instance of AppError', () => {
      const error = new DockerError('test');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ContainerNotFoundError', () => {
    it('should create a container not found error with the container ID', () => {
      const error = new ContainerNotFoundError('abc123');

      expect(error.message).toBe('Container abc123 not found');
      expect(error.code).toBe('CONTAINER_NOT_FOUND');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ContainerNotFoundError');
    });

    it('should be an instance of AppError', () => {
      const error = new ContainerNotFoundError('test');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should accept field-level errors', () => {
      const fields = {
        name: ['Name is required', 'Name must be alphanumeric'],
        port: ['Port must be a number'],
      };

      const error = new ValidationError('Validation failed', fields);

      expect(error.fields).toEqual(fields);
    });

    it('should have undefined fields when not provided', () => {
      const error = new ValidationError('Bad request');
      expect(error.fields).toBeUndefined();
    });

    it('should be an instance of AppError', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('createErrorResponse', () => {
    // Response.json() is a Web API not available in JSDOM by default
    // We mock it for these tests
    beforeAll(() => {
      if (typeof globalThis.Response === 'undefined') {
        (globalThis as Record<string, unknown>).Response = {
          json: (body: unknown, init?: { status?: number }) => ({
            status: init?.status || 200,
            body,
            json: async () => body,
          }),
        };
      }
    });

    it('should create a response for AppError', () => {
      const error = new AppError('Something went wrong', 'CUSTOM', 503);
      const response = createErrorResponse(error);

      expect(response.status).toBe(503);
    });

    it('should create a response for ValidationError with fields', () => {
      const error = new ValidationError('Validation failed', {
        name: ['Required'],
      });
      const response = createErrorResponse(error);

      expect(response.status).toBe(400);
    });

    it('should create a 500 response for unknown errors', () => {
      const response = createErrorResponse('unknown error');

      expect(response.status).toBe(500);
    });

    it('should create a response for DockerError', () => {
      const error = new DockerError('Docker not running');
      const response = createErrorResponse(error);

      expect(response.status).toBe(500);
    });

    it('should create a response for ContainerNotFoundError', () => {
      const error = new ContainerNotFoundError('xyz');
      const response = createErrorResponse(error);

      expect(response.status).toBe(404);
    });
  });
});
