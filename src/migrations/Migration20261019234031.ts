import { Migration } from '@mikro-orm/migrations';

export class Migration20261019234031 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`refresh_token\` drop foreign key \`refresh_token_usuario_id_foreign\`;`);

    this.addSql(`alter table \`foto_producto\` add index \`foto_producto_producto_id_index\`(\`producto_id\`);`);

    this.addSql(`alter table \`refresh_token\` add constraint \`refresh_token_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`refresh_token\` drop foreign key \`refresh_token_usuario_id_foreign\`;`);

    this.addSql(`alter table \`foto_producto\` drop index \`foto_producto_producto_id_index\`;`);

    this.addSql(`alter table \`refresh_token\` add constraint \`refresh_token_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\` (\`id\`) on update no action on delete no action;`);
  }

}
