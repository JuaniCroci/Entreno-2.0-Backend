import { IsInt, Min } from 'class-validator';

export class AddItemDto {
  @IsInt({ message: 'idProducto debe ser un entero' })
  @Min(1, { message: 'idProducto debe ser mayor a 0' })
  idProducto!: number;

  @IsInt({ message: 'cantidad debe ser un entero' })
  @Min(1, { message: 'cantidad debe ser al menos 1' })
  cantidad!: number;
}
