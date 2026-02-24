/**
 * Environment variable validation
 * Desktop app stores most config in settings.json - env vars are optional
 */

const optionalEnvVars = [
  'ANTHROPIC_API_KEY',  // AI troubleshooting (also stored in app settings)
  'DOCKER_HOST',        // Custom Docker socket path
] as const;

type OptionalEnvVar = (typeof optionalEnvVars)[number];

interface EnvValidationResult {
  valid: boolean;
  warnings: string[];
}

/**
 * Validates environment configuration
 * No required vars - desktop app uses local settings for most config
 */
export function validateEnv(): EnvValidationResult {
  const warnings: string[] = [];

  if (!process.env.ANTHROPIC_API_KEY) {
    warnings.push('ANTHROPIC_API_KEY not set - configure in app settings for AI troubleshooting');
  }

  return {
    valid: true,
    warnings,
  };
}

/**
 * Get an optional environment variable
 */
export function getOptionalEnv(key: OptionalEnvVar): string | undefined {
  return process.env[key];
}

/**
 * Check if AI features are available via env
 */
export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
