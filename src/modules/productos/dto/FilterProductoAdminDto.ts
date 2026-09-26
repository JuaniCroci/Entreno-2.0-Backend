import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class FilterProductoAdminDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsInt()
  @IsOptional()
  idTipoProducto?: number;

  @IsInt()
  @IsOptional()
  idMarca?: number;

  @IsInt()
  @IsOptional()
  idProveedor?: number;

  @IsOptional()
  activo?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  size?: number;
}
