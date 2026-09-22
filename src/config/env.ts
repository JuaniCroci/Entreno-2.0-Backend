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
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
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

function loadEnv(): Env {
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
    jwtSecret: required('JWT_SECRET'),
    bcryptRounds: int('BCRYPT_ROUNDS', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    adminEmail: process.env.ADMIN_EMAIL ?? 'admin@entreno.com',
    adminPassword: process.env.ADMIN_PASSWORD ?? 'changeme_en_produccion',
  };
}

export const env: Env = loadEnv();
