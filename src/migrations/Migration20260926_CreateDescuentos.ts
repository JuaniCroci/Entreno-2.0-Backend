import { Migration } from '@mikro-orm/migrations';

export class Migration20260926_CreateDescuentos extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`descuento\` (\`id\` int unsigned not null auto_increment primary key, \`descripcion\` varchar(255) not null, \`cantidad_minima\` int not null default 1, \`porcentaje\` decimal(10,2) not null, \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`descuento\` add index \`descuento_activo_index\`(\`activo\`);`);

    this.addSql(
      `create table \`descuento_producto\` (\`id\` int unsigned not null auto_increment primary key, \`id_descuento\` int unsigned not null, \`id_producto\` int unsigned not null, \`fecha_desde\` date not null, \`fecha_hasta\` date not null, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`descuento_producto\` add index \`descuento_producto_id_producto_index\`(\`id_producto\`);`);
    this.addSql(`alter table \`descuento_producto\` add index \`idx_vigencia\`(\`id_producto\`, \`fecha_desde\`, \`fecha_hasta\`);`);
    this.addSql(`alter table \`descuento_producto\` add constraint \`descuento_producto_id_descuento_foreign\` foreign key (\`id_descuento\`) references \`descuento\`(\`id\`);`);
    this.addSql(`alter table \`descuento_producto\` add constraint \`descuento_producto_id_producto_foreign\` foreign key (\`id_producto\`) references \`producto\`(\`id\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`descuento_producto\`;`);
    this.addSql(`drop table if exists \`descuento\`;`);
  }
}
