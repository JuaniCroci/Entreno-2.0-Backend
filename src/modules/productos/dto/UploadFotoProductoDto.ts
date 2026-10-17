import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UploadFotoProductoDto {
  @IsString({ message: 'altText debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'altText no debe estar vacío' })
  @Matches(/\S/, { message: 'altText no debe estar vacío' })
  @MaxLength(255, { message: 'altText debe tener máximo 255 caracteres' })
  altText!: string;

  @IsString({ message: 'fuente debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'fuente no debe estar vacía' })
  @Matches(/\S/, { message: 'fuente no debe estar vacía' })
  @MaxLength(255, { message: 'fuente debe tener máximo 255 caracteres' })
  fuente!: string;

  @IsString({ message: 'licencia debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'licencia no debe estar vacía' })
  @Matches(/\S/, { message: 'licencia no debe estar vacía' })
  @MaxLength(255, { message: 'licencia debe tener máximo 255 caracteres' })
  licencia!: string;

  @IsString({ message: 'atribucion debe ser una cadena de texto' })
  @IsOptional()
  @Matches(/\S/, { message: 'atribucion no debe estar vacía' })
  @MaxLength(500, { message: 'atribucion debe tener máximo 500 caracteres' })
  atribucion?: string;
}
