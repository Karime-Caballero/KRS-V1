import dotenv from 'dotenv';
import { Algorithm } from 'jsonwebtoken';

dotenv.config();

interface SecurityHeaders {
  csp: string;
  hsts: string;
  xssProtection: string;
  frameOptions: string;
  contentTypeOptions: string;
  referrerPolicy: string;
}

interface SecurityConfig {
  jwt: {
    secret: string;
    algorithm: Algorithm;
    expiresInSeconds: number;
    issuer: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  cors: {
    allowedOrigins: string[];
  };
  securityHeaders: SecurityHeaders;
}

// Validación de variables críticas antes de construir la configuración
const validateRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Variable de entorno requerida faltante: ${key}`);
  }
  return value;
};

// Obtener valores de entorno con validación
const jwtAlgorithm = validateRequiredEnv('JWT_ALGORITHM');
if (!['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'].includes(jwtAlgorithm)) {
  throw new Error(`❌ JWT_ALGORITHM inválido: ${jwtAlgorithm}`);
}

const securityConfig: SecurityConfig = {
  jwt: {
    secret: validateRequiredEnv('JWT_SECRET'),
    algorithm: jwtAlgorithm as Algorithm,
    expiresInSeconds: parseInt(validateRequiredEnv('JWT_EXPIRATION'), 10),
    issuer: validateRequiredEnv('JWT_ISSUER')
  },
  bcrypt: {
    saltRounds: parseInt(validateRequiredEnv('BCRYPT_SALT_ROUNDS'), 10)
  },
  cors: {
    allowedOrigins: validateRequiredEnv('ALLOWED_ORIGINS').split(',')
  },
  securityHeaders: {
    csp: validateRequiredEnv('CSP_HEADER'),
    hsts: validateRequiredEnv('HSTS_HEADER'),
    xssProtection: validateRequiredEnv('XSS_PROTECTION_HEADER'),
    frameOptions: validateRequiredEnv('FRAME_OPTIONS_HEADER'),
    contentTypeOptions: validateRequiredEnv('CONTENT_TYPE_OPTIONS_HEADER'),
    referrerPolicy: validateRequiredEnv('REFERRER_POLICY_HEADER')
  }
};

export default securityConfig;