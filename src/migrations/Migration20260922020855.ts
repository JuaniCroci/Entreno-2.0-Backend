import { Migration } from '@mikro-orm/migrations';

export class Migration20260922020855 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`usuario\` (\`id\` int unsigned not null auto_increment primary key, \`nombre\` varchar(255) not null, \`email\` varchar(255) not null, \`password_hash\` varchar(255) not null, \`telefono\` varchar(255) null, \`direccion\` varchar(255) null, \`rol\` enum('ADMIN', 'CLIENTE') not null default 'CLIENTE', \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`usuario\` add unique \`usuario_email_unique\`(\`email\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`usuario\`;`);
  }
}
