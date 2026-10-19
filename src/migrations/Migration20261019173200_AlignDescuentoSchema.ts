import { Migration } from '@mikro-orm/migrations';

export class Migration20261019173200_AlignDescuentoSchema extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `descuento` modify `cantidad_minima` int not null, modify `porcentaje` decimal(10,2) not null;',
    );
  }

  override async down(): Promise<void> {
    const porcentajesFraccionarios = await this.execute(
      'select `id` from `descuento` where `porcentaje` <> truncate(`porcentaje`, 0) limit 1;',
    );
    if (porcentajesFraccionarios.length > 0) {
      throw new Error('No se puede revertir: hay porcentajes decimales que se perderían.');
    }

    this.addSql(
      'alter table `descuento` modify `cantidad_minima` int not null default 1, modify `porcentaje` int not null;',
    );
  }
}
