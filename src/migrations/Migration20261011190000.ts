import { Migration } from '@mikro-orm/migrations';

export class Migration20261011190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`foto_producto\` (\`id\` char(36) not null primary key, \`producto_id\` int unsigned not null, \`nombre_archivo\` varchar(64) not null, \`mime_type\` varchar(32) not null, \`size_bytes\` int not null, \`alt_text\` varchar(255) not null, \`fuente\` varchar(255) not null, \`licencia\` varchar(255) not null, \`atribucion\` varchar(500) null, \`es_principal\` tinyint(1) not null default 1, \`created_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`foto_producto\` add index \`foto_producto_producto_principal_idx\`(\`producto_id\`, \`es_principal\`);`,
    );
    this.addSql(
      `alter table \`foto_producto\` add constraint \`foto_producto_producto_id_foreign\` foreign key (\`producto_id\`) references \`producto\` (\`id\`) on update cascade on delete cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`foto_producto\`;`);
  }
}
