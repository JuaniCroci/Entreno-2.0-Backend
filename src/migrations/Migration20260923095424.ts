import { Migration } from '@mikro-orm/migrations';

export class Migration20260923095424 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`refresh_token\` (\`id\` int unsigned not null auto_increment primary key, \`usuario_id\` int unsigned not null, \`token_hash\` varchar(255) not null, \`expires_at\` datetime not null, \`created_at\` datetime not null, \`revoked_at\` datetime null, index \`refresh_token_usuario_id_index\`(\`usuario_id\`), constraint \`refresh_token_usuario_id_foreign\` foreign key (\`usuario_id\`) references \`usuario\`(\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`refresh_token\``);
  }
}
