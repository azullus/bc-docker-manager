import { validateEnv, getOptionalEnv, isAIConfigured } from '@/lib/env';

describe('Environment Utilities', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateEnv', () => {
    it('should return valid true with no required vars', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = validateEnv();

      expect(result.valid).toBe(true);
    });

    it('should warn when ANTHROPIC_API_KEY is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = validateEnv();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('ANTHROPIC_API_KEY');
    });

    it('should not warn when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const result = validateEnv();

      expect(result.warnings.length).toBe(0);
    });
  });

  describe('getOptionalEnv', () => {
    it('should return the value when env var is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      expect(getOptionalEnv('ANTHROPIC_API_KEY')).toBe('test-key');
    });

    it('should return undefined when env var is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(getOptionalEnv('ANTHROPIC_API_KEY')).toBeUndefined();
    });

    it('should return DOCKER_HOST value', () => {
      process.env.DOCKER_HOST = 'tcp://localhost:2375';
      expect(getOptionalEnv('DOCKER_HOST')).toBe('tcp://localhost:2375');
    });
  });

  describe('isAIConfigured', () => {
    it('should return true when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      expect(isAIConfigured()).toBe(true);
    });

    it('should return false when ANTHROPIC_API_KEY is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(isAIConfigured()).toBe(false);
    });

    it('should return false for empty string', () => {
      process.env.ANTHROPIC_API_KEY = '';
      expect(isAIConfigured()).toBe(false);
    });
  });
});
