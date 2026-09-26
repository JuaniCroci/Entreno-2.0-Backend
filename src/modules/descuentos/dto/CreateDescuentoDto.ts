import { IsString, IsNotEmpty, IsInt, IsNumber, Min, Max } from 'class-validator';

export class CreateDescuentoDto {
  @IsString({ message: 'descripcion debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'descripcion no debe estar vacía' })
  descripcion!: string;

  @IsInt({ message: 'cantidadMinima debe ser un entero' })
  @Min(1, { message: 'cantidadMinima debe ser mayor o igual a 1' })
  cantidadMinima!: number;

  @IsNumber({}, { message: 'porcentaje debe ser un número' })
  @Min(0.01, { message: 'porcentaje debe ser mayor a 0' })
  @Max(100, { message: 'porcentaje debe ser menor o igual a 100' })
  porcentaje!: number;

  @IsNumber({}, { message: 'activo debe ser un booleano' })
  activo?: boolean;
}
