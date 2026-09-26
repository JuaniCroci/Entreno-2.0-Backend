import { IsString, IsOptional, Matches, IsEmail, MaxLength } from 'class-validator';

export class UpdateProveedorDto {
  @IsOptional()
  @IsString({ message: 'razonSocial debe ser una cadena de texto' })
  @MaxLength(255, { message: 'razonSocial debe tener máximo 255 caracteres' })
  razonSocial?: string;

  @IsOptional()
  @IsString({ message: 'cuit debe ser una cadena de texto' })
  @Matches(/^\d{11}$/, { message: 'cuit debe tener exactamente 11 dígitos numéricos' })
  cuit?: string;

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