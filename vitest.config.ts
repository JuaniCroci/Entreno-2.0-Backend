import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_secret_no_produccion_1234567890',
      BCRYPT_ROUNDS: '4',
      CORS_ORIGIN: 'http://localhost:5173',
      ADMIN_EMAIL: 'admin@test.local',
      ADMIN_PASSWORD: 'test_admin_password',
      DB_NAME: process.env.DB_NAME || 'entreno_test',
      DB_PORT: process.env.DB_PORT || '3307',
    },
  },
});
