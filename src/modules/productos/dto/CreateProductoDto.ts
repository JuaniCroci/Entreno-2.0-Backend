import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsDecimal, IsInt, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre no debe estar vacío' })
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(255, { message: 'nombre debe tener máximo 255 caracteres' })
  nombre!: string;

  @IsString({ message: 'descripcion debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'descripcion debe tener máximo 500 caracteres' })
  descripcion?: string | null;

  @IsDecimal({ decimal_digits: '0.00' }, { message: 'precioUnitario debe ser un valor decimal válido' })
  precioUnitario!: string;

  @IsInt({ message: 'stockInicial debe ser un entero' })
  @Min(0, { message: 'stockInicial debe ser mayor o igual a 0' })
  stockInicial!: number;

  @IsInt({ message: 'idTipoProducto debe ser un entero' })
  idTipoProducto!: number;

  @IsInt({ message: 'idMarca debe ser un entero' })
  idMarca!: number;

  @IsInt({ message: 'idProveedor debe ser un entero' })
  @IsOptional()
  idProveedor?: number;
}
