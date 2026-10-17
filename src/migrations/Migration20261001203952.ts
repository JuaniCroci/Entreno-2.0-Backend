import { Migration } from '@mikro-orm/migrations';

export class Migration20261001203952 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`refresh_token\` (\`id\` int unsigned not null auto_increment primary key, \`usuario_id\` int unsigned not null, \`token_hash\` varchar(255) not null, \`expires_at\` datetime not null, \`created_at\` datetime not null, \`revoked_at\` datetime null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`refresh_token\` add index \`refresh_token_usuario_id_index\`(\`usuario_id\`);`,
    );

    this.addSql(
      `create table \`pedido\` (\`id\` int unsigned not null auto_increment primary key, \`fecha\` datetime not null, \`estado\` varchar(255) not null default 'REALIZADO', \`importe_total\` decimal(10,2) not null, \`usuario_id\` int unsigned not null, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`pedido\` add index \`pedido_usuario_id_index\`(\`usuario_id\`);`);

    this.addSql(
      `create table \`pedido_item\` (\`id\` int unsigned not null auto_increment primary key, \`pedido_id\` int unsigned not null, \`producto_id\` int unsigned not null, \`cantidad\` int not null, \`precio_unitario\` decimal(10,2) not null, \`subtotal\` decimal(10,2) not null, \`descuento_aplicado\` decimal(10,2) null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`pedido_item\` add index \`pedido_item_pedido_id_index\`(\`pedido_id\`);`,
    );
    this.addSql(
      `alter table \`pedido_item\` add index \`pedido_item_producto_id_index\`(\`producto_id\`);`,
    );
    this.addSql(
      `alter table \`pedido_item\` add unique \`pedido_item_pedido_id_producto_id_unique\`(\`pedido_id\`, \`producto_id\`);`,
    );

    this.addSql(
      `create table \`historial_estado\` (\`id\` int unsigned not null auto_increment primary key, \`pedido_id\` int unsigned not null, \`estado\` varchar(255) not null, \`fecha\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`historial_estado\` add index \`historial_estado_pedido_id_index\`(\`pedido_id\`);`,
    );
    this.addSql(
      `alter table \`historial_estado\` add index \`historial_estado_pedido_id_estado_index\`(\`pedido_id\`, \`estado\`);`,
    );

    this.addSql(
      `create table \`carrito\` (\`id\` int unsigned not null auto_increment primary key, \`estado\` varchar(255) not null default 'ACTIVO', \`usuario_id\` int unsigned not null, \`usuario_activo_slot\` int null, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`carrito\` add index \`carrito_usuario_id_index\`(\`usuario_id\`);`);
    this.addSql(
      `alter table \`carrito\` add unique \`carrito_usuario_activo_slot_unique\`(\`usuario_activo_slot\`);`,
    );

    this.addSql(
      `create table \`carrito_item\` (\`id\` int unsigned not null auto_increment primary key, \`carrito_id\` int unsigned not null, \`producto_id\` int unsigned not null, \`cantidad\` int not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`carrito_item\` add index \`carrito_item_carrito_id_index\`(\`carrito_id\`);`,
    );
    this.addSql(
      `alter table \`carrito_item\` add index \`carrito_item_producto_id_index\`(\`producto_id\`);`,
    );
    this.addSql(
      `alter table \`carrito_item\` add unique \`carrito_item_carrito_id_producto_id_unique\`(\`carrito_id\`, \`producto_id\`);`,
    );

    this.addSql(
      `alter table \`refresh_token\` add constraint \`refresh_token_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade;`,
    );

    this.addSql(
      `alter table \`pedido\` add constraint \`pedido_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade;`,
    );

    this.addSql(
      `alter table \`pedido_item\` add constraint \`pedido_item_pedido_id_foreign\` foreign key (\`pedido_id\`) references \`pedido\` (\`id\`) on update cascade;`,
    );
    this.addSql(
      `alter table \`pedido_item\` add constraint \`pedido_item_producto_id_foreign\` foreign key (\`producto_id\`) references \`producto\` (\`id\`) on update cascade;`,
    );

    this.addSql(
      `alter table \`historial_estado\` add constraint \`historial_estado_pedido_id_foreign\` foreign key (\`pedido_id\`) references \`pedido\` (\`id\`) on update cascade;`,
    );

    this.addSql(
      `alter table \`carrito\` add constraint \`carrito_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade;`,
    );

    this.addSql(
      `alter table \`carrito_item\` add constraint \`carrito_item_carrito_id_foreign\` foreign key (\`carrito_id\`) references \`carrito\` (\`id\`) on update cascade;`,
    );
    this.addSql(
      `alter table \`carrito_item\` add constraint \`carrito_item_producto_id_foreign\` foreign key (\`producto_id\`) references \`producto\` (\`id\`) on update cascade;`,
    );

    this.addSql(`drop table if exists \`refresh_tokens\`;`);

    this.addSql(`alter table \`producto\` drop foreign key \`producto_id_marca_foreign\`;`);
    this.addSql(`alter table \`producto\` drop foreign key \`producto_id_proveedor_foreign\`;`);
    this.addSql(`alter table \`producto\` drop foreign key \`producto_id_tipo_producto_foreign\`;`);

    this.addSql(
      `alter table \`descuento_producto\` drop foreign key \`descuento_producto_id_descuento_foreign\`;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` drop foreign key \`descuento_producto_id_producto_foreign\`;`,
    );

    this.addSql(`alter table \`descuento\` drop index \`descuento_activo_index\`;`);

    this.addSql(`alter table \`proveedor\` modify \`cuit\` varchar(255) not null;`);

    this.addSql(`alter table \`tipo_producto\` modify \`descripcion\` varchar(255);`);

    this.addSql(`alter table \`producto\` drop index \`producto_id_marca_index\`;`);
    this.addSql(`alter table \`producto\` drop index \`producto_id_proveedor_index\`;`);
    this.addSql(`alter table \`producto\` drop index \`producto_id_tipo_producto_index\`;`);
    this.addSql(
      `alter table \`producto\` drop column \`id_tipo_producto\`, drop column \`id_marca\`;`,
    );

    this.addSql(
      `alter table \`producto\` add \`tipo_producto_id\` int unsigned not null, add \`marca_id\` int unsigned not null;`,
    );
    this.addSql(`alter table \`producto\` modify \`descripcion\` varchar(255);`);
    this.addSql(
      `alter table \`producto\` add constraint \`producto_tipo_producto_id_foreign\` foreign key (\`tipo_producto_id\`) references \`tipo_producto\` (\`id\`) on update cascade;`,
    );
    this.addSql(
      `alter table \`producto\` add constraint \`producto_marca_id_foreign\` foreign key (\`marca_id\`) references \`marca\` (\`id\`) on update cascade;`,
    );
    this.addSql(
      `alter table \`producto\` change \`id_proveedor\` \`proveedor_id\` int unsigned null;`,
    );
    this.addSql(
      `alter table \`producto\` add constraint \`producto_proveedor_id_foreign\` foreign key (\`proveedor_id\`) references \`proveedor\` (\`id\`) on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table \`producto\` add index \`producto_tipo_producto_id_index\`(\`tipo_producto_id\`);`,
    );
    this.addSql(`alter table \`producto\` add index \`producto_marca_id_index\`(\`marca_id\`);`);
    this.addSql(
      `alter table \`producto\` add index \`producto_proveedor_id_index\`(\`proveedor_id\`);`,
    );

    this.addSql(
      `alter table \`descuento_producto\` drop index \`descuento_producto_id_descuento_foreign\`;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` drop index \`descuento_producto_id_producto_index\`;`,
    );
    this.addSql(`alter table \`descuento_producto\` drop index \`idx_vigencia\`;`);
    this.addSql(
      `alter table \`descuento_producto\` drop column \`id_descuento\`, drop column \`id_producto\`, drop column \`created_at\`, drop column \`updated_at\`;`,
    );

    this.addSql(
      `alter table \`descuento_producto\` add \`descuento_id\` int unsigned not null, add \`producto_id\` int unsigned not null;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add constraint \`descuento_producto_descuento_id_foreign\` foreign key (\`descuento_id\`) references \`descuento\` (\`id\`) on update cascade;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add constraint \`descuento_producto_producto_id_foreign\` foreign key (\`producto_id\`) references \`producto\` (\`id\`) on update cascade;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add index \`descuento_producto_descuento_id_index\`(\`descuento_id\`);`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add index \`descuento_producto_producto_id_index\`(\`producto_id\`);`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`pedido_item\` drop foreign key \`pedido_item_pedido_id_foreign\`;`);

    this.addSql(
      `alter table \`historial_estado\` drop foreign key \`historial_estado_pedido_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`carrito_item\` drop foreign key \`carrito_item_carrito_id_foreign\`;`,
    );

    this.addSql(
      `create table \`refresh_tokens\` (\`id\` int unsigned not null auto_increment primary key, \`usuario_id\` int unsigned not null, \`token_hash\` varchar(255) not null, \`expires_at\` datetime not null, \`created_at\` datetime not null, \`revoked_at\` datetime null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`refresh_tokens\` add index \`refresh_tokens_usuario_id_index\`(\`usuario_id\`);`,
    );

    this.addSql(
      `alter table \`refresh_tokens\` add constraint \`refresh_tokens_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update no action on delete no action;`,
    );

    this.addSql(`drop table if exists \`refresh_token\`;`);

    this.addSql(`drop table if exists \`pedido\`;`);

    this.addSql(`drop table if exists \`pedido_item\`;`);

    this.addSql(`drop table if exists \`historial_estado\`;`);

    this.addSql(`drop table if exists \`carrito\`;`);

    this.addSql(`drop table if exists \`carrito_item\`;`);

    this.addSql(
      `alter table \`descuento_producto\` drop foreign key \`descuento_producto_descuento_id_foreign\`;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` drop foreign key \`descuento_producto_producto_id_foreign\`;`,
    );

    this.addSql(`alter table \`producto\` drop foreign key \`producto_tipo_producto_id_foreign\`;`);
    this.addSql(`alter table \`producto\` drop foreign key \`producto_marca_id_foreign\`;`);
    this.addSql(`alter table \`producto\` drop foreign key \`producto_proveedor_id_foreign\`;`);

    this.addSql(`alter table \`descuento\` add index \`descuento_activo_index\`(\`activo\`);`);

    this.addSql(
      `alter table \`descuento_producto\` drop index \`descuento_producto_descuento_id_index\`;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` drop index \`descuento_producto_producto_id_index\`;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` drop column \`descuento_id\`, drop column \`producto_id\`;`,
    );

    this.addSql(
      `alter table \`descuento_producto\` add \`id_descuento\` int unsigned not null, add \`id_producto\` int unsigned not null, add \`created_at\` datetime not null, add \`updated_at\` datetime not null;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add constraint \`descuento_producto_id_descuento_foreign\` foreign key (\`id_descuento\`) references \`descuento\` (\`id\`) on update no action on delete no action;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add constraint \`descuento_producto_id_producto_foreign\` foreign key (\`id_producto\`) references \`producto\` (\`id\`) on update no action on delete no action;`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add index \`descuento_producto_id_descuento_foreign\`(\`id_descuento\`);`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add index \`descuento_producto_id_producto_index\`(\`id_producto\`);`,
    );
    this.addSql(
      `alter table \`descuento_producto\` add index \`idx_vigencia\`(\`id_producto\`, \`fecha_desde\`, \`fecha_hasta\`);`,
    );

    this.addSql(`alter table \`producto\` drop index \`producto_tipo_producto_id_index\`;`);
    this.addSql(`alter table \`producto\` drop index \`producto_marca_id_index\`;`);
    this.addSql(`alter table \`producto\` drop index \`producto_proveedor_id_index\`;`);
    this.addSql(
      `alter table \`producto\` drop column \`tipo_producto_id\`, drop column \`marca_id\`;`,
    );

    this.addSql(
      `alter table \`producto\` add \`id_tipo_producto\` int unsigned not null, add \`id_marca\` int unsigned not null;`,
    );
    this.addSql(`alter table \`producto\` modify \`descripcion\` varchar(500);`);
    this.addSql(
      `alter table \`producto\` add constraint \`producto_id_tipo_producto_foreign\` foreign key (\`id_tipo_producto\`) references \`tipo_producto\` (\`id\`) on update no action on delete no action;`,
    );
    this.addSql(
      `alter table \`producto\` add constraint \`producto_id_marca_foreign\` foreign key (\`id_marca\`) references \`marca\` (\`id\`) on update no action on delete no action;`,
    );
    this.addSql(
      `alter table \`producto\` change \`proveedor_id\` \`id_proveedor\` int unsigned null;`,
    );
    this.addSql(
      `alter table \`producto\` add constraint \`producto_id_proveedor_foreign\` foreign key (\`id_proveedor\`) references \`proveedor\` (\`id\`) on update no action on delete no action;`,
    );
    this.addSql(`alter table \`producto\` add index \`producto_id_marca_index\`(\`id_marca\`);`);
    this.addSql(
      `alter table \`producto\` add index \`producto_id_proveedor_index\`(\`id_proveedor\`);`,
    );
    this.addSql(
      `alter table \`producto\` add index \`producto_id_tipo_producto_index\`(\`id_tipo_producto\`);`,
    );

    this.addSql(`alter table \`proveedor\` modify \`cuit\` varchar(11) not null;`);

    this.addSql(`alter table \`tipo_producto\` modify \`descripcion\` varchar(500);`);
  }
}
