import { IsString, IsOptional, IsInt, IsDecimal, MinLength, MaxLength } from 'class-validator';

export class UpdateProductoDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsOptional()
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(255, { message: 'nombre debe tener máximo 255 caracteres' })
  nombre?: string;

  @IsString({ message: 'descripcion debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'descripcion debe tener máximo 500 caracteres' })
  descripcion?: string | null;

  @IsDecimal({ decimal_digits: '0.00' }, { message: 'precioUnitario debe ser un valor decimal válido' })
  @IsOptional()
  precioUnitario?: string;

  @IsInt({ message: 'idTipoProducto debe ser un entero' })
  @IsOptional()
  idTipoProducto?: number;

  @IsInt({ message: 'idMarca debe ser un entero' })
  @IsOptional()
  idMarca?: number;

  @IsInt({ message: 'idProveedor debe ser un entero' })
  @IsOptional()
  idProveedor?: number;
}
