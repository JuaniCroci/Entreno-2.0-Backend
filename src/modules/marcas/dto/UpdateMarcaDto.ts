import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateMarcaDto {
  @IsOptional()
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(80, { message: 'nombre debe tener máximo 80 caracteres' })
  nombre?: string;
}