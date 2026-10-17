import 'dotenv/config';
import { RequestContext } from '@mikro-orm/core';
import { initDb, getOrm } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Rol } from '../src/modules/usuarios/entity/Usuario.js';

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

  try {
    await RequestContext.create(em, async () => {
      const { UsuarioService } = await import('../src/modules/usuarios/service/UsuarioService.js');
      const service = new UsuarioService();
      const existing = await service.findByEmail(env.adminEmail);
      if (!existing) {
        await service.create({
          nombre: 'Administrador',
          email: env.adminEmail,
          password: env.adminPassword,
          rol: Rol.ADMIN,
        });
      }
    });
  } catch {
    // admin may already exist
  }
}

await setup();
