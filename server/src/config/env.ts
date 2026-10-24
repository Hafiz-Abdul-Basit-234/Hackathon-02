import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '3000',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'saylani_hcm_lite_jwt_secret_super_secure_key_2026',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};

export interface ConfigValidationResult {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
}

export function validateEnvironment(): ConfigValidationResult {
  const missingVariables: string[] = [];
  const warnings: string[] = [];

  if (!ENV.MONGODB_URI) {
    missingVariables.push('MONGODB_URI');
  }

  if (!ENV.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY (AI features will show a configuration reminder until set)');
  }

  if (!ENV.JWT_SECRET) {
    missingVariables.push('JWT_SECRET');
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    warnings,
  };
}
