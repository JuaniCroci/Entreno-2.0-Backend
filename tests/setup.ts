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

  try {
    await em.getConnection().execute(`
      CREATE TABLE IF NOT EXISTS \`marca\` (\`id\` int unsigned not null auto_increment primary key, \`nombre\` varchar(255) not null, \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB
    `);
    await em.getConnection().execute(`DELETE FROM \`marca\``);
  } catch {
    // table may already exist
  }

  try {
    await em.getConnection().execute(`
      CREATE TABLE IF NOT EXISTS \`tipo_producto\` (\`id\` int unsigned not null auto_increment primary key, \`nombre\` varchar(255) not null, \`descripcion\` varchar(500) null, \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB
    `);
    await em.getConnection().execute(`DELETE FROM \`tipo_producto\``);
  } catch {
    // table may already exist
  }

  try {
    await em.getConnection().execute(`
      CREATE TABLE IF NOT EXISTS \`proveedor\` (\`id\` int unsigned not null auto_increment primary key, \`razon_social\` varchar(255) not null, \`cuit\` varchar(11) not null, \`telefono\` varchar(255) null, \`email\` varchar(255) null, \`domicilio\` varchar(255) null, \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB
    `);
    await em.getConnection().execute(`DELETE FROM \`proveedor\``);
  } catch {
    // table may already exist
  }

  try {
    await em.getConnection().execute(`
      CREATE TABLE IF NOT EXISTS \`producto\` (\`id\` int unsigned not null auto_increment primary key, \`nombre\` varchar(255) not null, \`descripcion\` varchar(500) null, \`precioUnitario\` varchar(20) not null, \`stock\` int not null default 0, \`activo\` tinyint(1) not null default true, \`idTipoProducto\` int unsigned not null, \`idMarca\` int unsigned not null, \`idProveedor\` int unsigned null, \`created_at\` datetime not null, \`updated_at\` datetime not null, index \`producto_idTipoProducto_index\`(\`idTipoProducto\`), constraint \`producto_idTipoProducto_foreign\` foreign key (\`idTipoProducto\`) references \`tipo_producto\`(\`id\`), index \`producto_idMarca_index\`(\`idMarca\`), constraint \`producto_idMarca_foreign\` foreign key (\`idMarca\`) references \`marca\`(\`id\`), index \`producto_idProveedor_index\`(\`idProveedor\`), constraint \`producto_idProveedor_foreign\` foreign key (\`idProveedor\`) references \`proveedor\`(\`id\`)
    `);
    await em.getConnection().execute(`DELETE FROM \`producto\``);
  } catch {
    // table may already exist
  }
}

setup();
