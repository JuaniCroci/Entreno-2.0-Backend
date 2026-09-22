/**
 * Seed idempotente de admin — feature 002 (Auth y usuarios).
 * Crea el usuario ADMIN si no existe; no duplica ni pisa contraseñas.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { RequestContext } from '@mikro-orm/core';
import { initDb, closeDb, getOrm } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { UsuarioService } from '../src/modules/usuarios/service/UsuarioService.js';
import { Rol } from '../src/modules/usuarios/entity/Usuario.js';

async function run(): Promise<void> {
  await initDb();
  await RequestContext.create(getOrm().em, async () => {
    const service = new UsuarioService();
    const existing = await service.findByEmail(env.adminEmail);
    if (existing) {
      console.info('seed:admin — el usuario ya existe, no se modifica.');
    } else {
      await service.create({
        nombre: 'Administrador',
        email: env.adminEmail,
        password: env.adminPassword,
        rol: Rol.ADMIN,
      });
      console.info(`seed:admin — creado admin ${env.adminEmail}`);
    }
  });
  await closeDb();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
