import { Migration } from '@mikro-orm/migrations';

export class Migration20260924000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`marca\` (\`id\` int unsigned not null auto_increment primary key, \`nombre\` varchar(255) not null, \`activo\` tinyint(1) not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(`alter table \`marca\` add unique \`marca_nombre_unique\`(\`nombre\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`marca\``);
  }
}