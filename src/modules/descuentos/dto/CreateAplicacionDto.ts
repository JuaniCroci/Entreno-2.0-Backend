import { Type } from 'class-transformer';
import { IsInt, IsDate } from 'class-validator';

export class CreateAplicacionDto {
  @IsInt({ message: 'idProducto debe ser un entero' })
  idProducto!: number;

  @Type(() => Date)
  @IsDate({ message: 'fechaDesde debe ser una fecha válida' })
  fechaDesde!: Date;

  @Type(() => Date)
  @IsDate({ message: 'fechaHasta debe ser una fecha válida' })
  fechaHasta!: Date;
}
