import 'dotenv/config';
import { initDb, getOrm } from '../src/config/db.js';

async function setup() {
  await initDb();
  const orm = getOrm();
  const dbName = process.env.DB_NAME || 'entreno_test';
  const em = orm.em;

  try {
    await em.getConnection().execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  } catch {
    // ignore
  }

  try {
    await orm.getSchemaGenerator().createSchema();
  } catch {
    // schema may already exist partially
  }

  try {
    await em.getConnection().execute(`
      CREATE TABLE IF NOT EXISTS \`refresh_token\` (
        \`id\` int unsigned not null auto_increment primary key,
        \`usuario_id\` int unsigned not null,
        \`token_hash\` varchar(255) not null,
        \`expires_at\` datetime not null,
        \`created_at\` datetime not null,
        \`revoked_at\` datetime null,
        index \`refresh_token_usuario_id_index\`(\`usuario_id\`),
        constraint \`refresh_token_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\`(\`id\`)
      ) default character set utf8mb4 engine = InnoDB
    `);
  } catch {
    // table may already exist
  }
}

setup();
