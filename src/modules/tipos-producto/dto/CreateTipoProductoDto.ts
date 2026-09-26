import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateTipoProductoDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre no debe estar vacío' })
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(80, { message: 'nombre debe tener máximo 80 caracteres' })
  nombre!: string;

  @IsOptional()
  @IsString({ message: 'descripcion debe ser una cadena de texto' })
  @MaxLength(500, { message: 'descripcion debe tener máximo 500 caracteres' })
  descripcion?: string;
}