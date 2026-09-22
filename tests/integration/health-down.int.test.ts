import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { getOrm } from '../../src/config/db.js';
import { initDb, closeDb } from '../../src/config/db.js';

describe('GET /api/health con base caída', () => {
  it('responde 503 con database down', async () => {
    await initDb();
    const app: Express = createApp();
    const connection = getOrm().em.getConnection();

    const originalExecute = connection.execute.bind(connection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connection as any).execute = async () => {
      throw new Error('connection refused');
    };

    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'error', database: 'down' });
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (connection as any).execute = originalExecute;
      await closeDb();
    }
  });
});
