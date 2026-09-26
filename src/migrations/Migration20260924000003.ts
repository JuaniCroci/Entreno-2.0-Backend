import { Migration } from '@mikro-orm/migrations';

export class Migration20260924000003 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`producto\` (\`id\` int unsigned not null auto_increment primary key, \`nombre\` varchar(255) not null, \`descripcion\` varchar(500) null, \`precio_unitario\` decimal(10,2) not null, \`stock\` int not null default 0, \`activo\` tinyint(1) not null default true, \`id_tipo_producto\` int unsigned not null, \`id_marca\` int unsigned not null, \`id_proveedor\` int unsigned null, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`producto\` add index \`producto_id_tipo_producto_index\`(\`id_tipo_producto\`);`);
    this.addSql(`alter table \`producto\` add index \`producto_id_marca_index\`(\`id_marca\`);`);
    this.addSql(`alter table \`producto\` add index \`producto_id_proveedor_index\`(\`id_proveedor\`);`);
    this.addSql(`alter table \`producto\` add constraint \`producto_id_tipo_producto_foreign\` foreign key (\`id_tipo_producto\`) references \`tipo_producto\`(\`id\`);`);
    this.addSql(`alter table \`producto\` add constraint \`producto_id_marca_foreign\` foreign key (\`id_marca\`) references \`marca\`(\`id\`);`);
    this.addSql(`alter table \`producto\` add constraint \`producto_id_proveedor_foreign\` foreign key (\`id_proveedor\`) references \`proveedor\`(\`id\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`producto\`;`);
  }
}
