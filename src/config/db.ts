import { RequestContext as MikroRequestContext, Utils } from '@mikro-orm/core';
import type { EntityManager, Options } from '@mikro-orm/mysql';
import { MikroORM, MySqlDriver } from '@mikro-orm/mysql';
import type { Request, Response, NextFunction } from 'express';
import { pathToFileURL } from 'node:url';
import { env } from './env.js';

// Windows + ESM: el dynamicImport de MikroORM puede dejar paths `C:\...`
// y el loader nativo exige `file://`. Normalizamos siempre a URL de archivo.
Utils.setDynamicImportProvider((id: string | URL) => {
  const raw = typeof id === 'string' ? id : id.href;
  const url =
    raw.startsWith('file:') || raw.startsWith('node:') || raw.startsWith('data:')
      ? raw
      : pathToFileURL(raw).href;
  return import(url);
});

export const dbOptions: Options = {
  driver: MySqlDriver,
  dbName: env.dbName,
  clientUrl: `mysql://${env.dbUser}:${env.dbPassword}@${env.dbHost}:${env.dbPort}/${env.dbName}`,
  entities: ['./src/modules/**/entity/*.js'],
  entitiesTs: ['./src/modules/**/entity/*.ts'],
  discovery: {
    warnWhenNoEntities: false,
  },
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
    tableName: 'mikro_orm_migrations',
    transactional: true,
  },
  debug: env.nodeEnv === 'development',
};

type Orm = Awaited<ReturnType<typeof MikroORM.init>>;

let orm: Orm | null = null;

export async function initDb(): Promise<Orm> {
  if (orm) return orm;
  orm = await MikroORM.init(dbOptions);
  return orm;
}

export async function closeDb(): Promise<void> {
  if (!orm) return;
  await orm.close(true);
  orm = null;
}

export function getOrm(): Orm {
  if (!orm) throw new Error('MikroORM no inicializado: llamar a initDb() en el bootstrap');
  return orm;
}

export function getEm(): EntityManager {
  return getOrm().em as unknown as EntityManager;
}

export function requestContext(_req: Request, _res: Response, next: NextFunction): void {
  MikroRequestContext.create(getEm(), next);
}
