export type NodeEnv = 'development' | 'test' | 'production';

export interface Env {
  nodeEnv: NodeEnv;
  port: number;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  jwtSecret: string;
  bcryptRounds: number;
  corsOrigin: string;
  adminEmail: string;
  adminPassword: string;
  passwordMinLength: number;
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

function jwtSecret(): string {
  const value = required('JWT_SECRET');
  if (value.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Variable de entorno ${name} debe ser un entero positivo`);
  }
  return parsed;
}

export function loadEnv(): Env {
  const rawNodeEnv = process.env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(rawNodeEnv)) {
    throw new Error(`NODE_ENV inválido: ${rawNodeEnv}`);
  }

  return {
    nodeEnv: rawNodeEnv as NodeEnv,
    port: int('PORT', 3000),
    dbHost: process.env.DB_HOST ?? 'localhost',
    dbPort: int('DB_PORT', 3306),
    dbUser: required('DB_USER'),
    dbPassword: required('DB_PASSWORD'),
    dbName: required('DB_NAME'),
    jwtSecret: jwtSecret(),
    bcryptRounds: int('BCRYPT_ROUNDS', 12),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    adminEmail: process.env.ADMIN_EMAIL ?? 'admin@entreno.com',
    adminPassword:
      rawNodeEnv === 'production'
        ? required('ADMIN_PASSWORD')
        : process.env.ADMIN_PASSWORD ?? 'changeme_en_produccion',
    passwordMinLength: int('PASSWORD_MIN_LENGTH', 8),
  };
}

export const env: Env = loadEnv();
