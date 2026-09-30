import { IsOptional, IsInt, IsNumber, IsIn, Min, Max } from 'class-validator';

export type ProductoOrden = 'nombre' | 'precio';
export type ProductoDir = 'asc' | 'desc';

export class FilterProductoPublicDto {
  @IsInt({ message: 'idTipoProducto debe ser un entero' })
  @IsOptional()
  idTipoProducto?: number;

  @IsInt({ message: 'idMarca debe ser un entero' })
  @IsOptional()
  idMarca?: number;

  @IsNumber({}, { message: 'precioMin debe ser un número' })
  @Min(0, { message: 'precioMin debe ser mayor o igual a 0' })
  @IsOptional()
  precioMin?: number;

  @IsNumber({}, { message: 'precioMax debe ser un número' })
  @Min(0, { message: 'precioMax debe ser mayor o igual a 0' })
  @IsOptional()
  precioMax?: number;

  @IsIn(['nombre', 'precio'], { message: 'orden debe ser nombre o precio' })
  @IsOptional()
  orden?: ProductoOrden;

  @IsIn(['asc', 'desc'], { message: 'dir debe ser asc o desc' })
  @IsOptional()
  dir?: ProductoDir;

  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  @IsOptional()
  page?: number;

  @IsInt({ message: 'size debe ser un entero' })
  @Min(1, { message: 'size debe ser mayor o igual a 1' })
  @Max(100, { message: 'size no puede superar 100' })
  @IsOptional()
  size?: number;
}
