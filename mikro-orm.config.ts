import 'dotenv/config';
import 'reflect-metadata';
import type { Options } from '@mikro-orm/mysql';
import { MySqlDriver } from '@mikro-orm/mysql';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

const dbOptions: Options = {
  driver: MySqlDriver,
  dbName: required('DB_NAME'),
  clientUrl: `mysql://${required('DB_USER')}:${required('DB_PASSWORD')}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '3307'}/${required('DB_NAME')}`,
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
  debug: process.env.NODE_ENV === 'development',
};

export default dbOptions;
