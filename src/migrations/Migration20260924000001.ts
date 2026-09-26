import { Migration } from '@mikro-orm/migrations';

export class Migration20260924000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`tipo_producto\` (\`id\` int unsigned not null auto_increment primary key, \`nombre\` varchar(255) not null, \`descripcion\` varchar(500) null, \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`tipo_producto\` add unique \`tipo_producto_nombre_unique\`(\`nombre\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`tipo_producto\``);
  }
}