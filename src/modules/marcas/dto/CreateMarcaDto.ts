import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateMarcaDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre no debe estar vacío' })
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(80, { message: 'nombre debe tener máximo 80 caracteres' })
  nombre!: string;
}