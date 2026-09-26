import { Migration } from '@mikro-orm/migrations';

export class Migration20260924000002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`proveedor\` (\`id\` int unsigned not null auto_increment primary key, \`razon_social\` varchar(255) not null, \`cuit\` varchar(11) not null, \`telefono\` varchar(255) null, \`email\` varchar(255) null, \`domicilio\` varchar(255) null, \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`proveedor\` add unique \`proveedor_cuit_unique\`(\`cuit\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`proveedor\``);
  }
}