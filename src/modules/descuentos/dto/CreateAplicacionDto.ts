import { IsInt, IsDate } from 'class-validator';

export class CreateAplicacionDto {
  @IsInt({ message: 'idProducto debe ser un entero' })
  idProducto!: number;

  @IsDate({ message: 'fechaDesde debe ser una fecha válida' })
  fechaDesde!: Date;

  @IsDate({ message: 'fechaHasta debe ser una fecha válida' })
  fechaHasta!: Date;
}
