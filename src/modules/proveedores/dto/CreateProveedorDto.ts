import { IsString, IsNotEmpty, Matches, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateProveedorDto {
  @IsString({ message: 'razonSocial debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'razonSocial no debe estar vacío' })
  @MaxLength(255, { message: 'razonSocial debe tener máximo 255 caracteres' })
  razonSocial!: string;

  @IsString({ message: 'cuit debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'cuit no debe estar vacío' })
  @Matches(/^\d{11}$/, { message: 'cuit debe tener exactamente 11 dígitos numéricos' })
  cuit!: string;

  @IsOptional()
  @IsString({ message: 'telefono debe ser una cadena de texto' })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email debe ser un email válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'domicilio debe ser una cadena de texto' })
  @MaxLength(255, { message: 'domicilio debe tener máximo 255 caracteres' })
  domicilio?: string;
}