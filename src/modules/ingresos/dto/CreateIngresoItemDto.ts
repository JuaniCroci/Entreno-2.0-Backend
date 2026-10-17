import { IsInt, Min, IsDecimal } from 'class-validator';

export class CreateIngresoItemDto {
  @IsInt({ message: 'idProducto debe ser un entero' })
  @Min(1, { message: 'idProducto debe ser mayor a 0' })
  idProducto!: number;

  @IsInt({ message: 'cantidad debe ser un entero' })
  @Min(1, { message: 'cantidad debe ser mayor o igual a 1' })
  cantidad!: number;

  @IsDecimal(
    { decimal_digits: '1,2' },
    { message: 'precioUnitario debe ser un valor decimal válido' },
  )
  precioUnitario!: string;
}
