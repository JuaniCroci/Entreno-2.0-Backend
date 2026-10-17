import { Migration } from '@mikro-orm/migrations';

export class Migration20260929224545_CreateIngresos extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`ingreso\` (\`id\` int unsigned not null auto_increment primary key, \`nro_ingreso\` varchar(255) not null, \`fecha\` datetime not null, \`importe_total\` decimal(10,2) not null, \`estado\` varchar(255) not null default 'REGISTRADO', \`proveedor_id\` int unsigned not null, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`ingreso\` add index \`ingreso_proveedor_id_index\`(\`proveedor_id\`);`,
    );
    this.addSql(
      `alter table \`ingreso\` add unique \`ingreso_nro_ingreso_unique\`(\`nro_ingreso\`);`,
    );

    this.addSql(
      `create table \`ingreso_item\` (\`id\` int unsigned not null auto_increment primary key, \`ingreso_id\` int unsigned not null, \`producto_id\` int unsigned not null, \`cantidad\` int not null, \`precio_unitario\` decimal(10,2) not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`ingreso_item\` add index \`ingreso_item_ingreso_id_index\`(\`ingreso_id\`);`,
    );
    this.addSql(
      `alter table \`ingreso_item\` add index \`ingreso_item_producto_id_index\`(\`producto_id\`);`,
    );
    this.addSql(
      `alter table \`ingreso_item\` add unique \`ingreso_item_ingreso_id_producto_id_unique\`(\`ingreso_id\`, \`producto_id\`);`,
    );

    this.addSql(
      `alter table \`ingreso\` add constraint \`ingreso_proveedor_id_foreign\` foreign key (\`proveedor_id\`) references \`proveedor\` (\`id\`) on update cascade;`,
    );

    this.addSql(
      `alter table \`ingreso_item\` add constraint \`ingreso_item_ingreso_id_foreign\` foreign key (\`ingreso_id\`) references \`ingreso\` (\`id\`) on update cascade;`,
    );
    this.addSql(
      `alter table \`ingreso_item\` add constraint \`ingreso_item_producto_id_foreign\` foreign key (\`producto_id\`) references \`producto\` (\`id\`) on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table \`ingreso_item\` drop foreign key \`ingreso_item_ingreso_id_foreign\`;`,
    );

    this.addSql(`drop table if exists \`ingreso\`;`);

    this.addSql(`drop table if exists \`ingreso_item\`;`);
  }
}
