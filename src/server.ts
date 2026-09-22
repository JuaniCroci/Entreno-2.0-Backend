import 'dotenv/config';
import 'reflect-metadata';
import { env } from './config/env.js';
import { initDb, closeDb } from './config/db.js';
import app from './app.js';

async function bootstrap(): Promise<void> {
  try {
    await initDb();
    const server = app.listen(env.port, () => {
      console.info(`Entreno 2.0 API escuchando en http://localhost:${env.port}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.info(`Recibido ${signal}, cerrando...`);
      server.close(async () => {
        await closeDb();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (err) {
    console.error('Error al iniciar la API:', err);
    process.exit(1);
  }
}

void bootstrap();
