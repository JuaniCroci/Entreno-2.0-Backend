import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { env } from '../../../config/env.js';

export class UpdateClienteDto {
  @IsOptional()
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  nombre?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email debe ser un email válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'password debe ser una cadena de texto' })
  @MinLength(env.passwordMinLength, { message: `password debe tener al menos ${env.passwordMinLength} caracteres` })
  password?: string;

  @IsOptional()
  @IsString({ message: 'telefono debe ser una cadena de texto' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'direccion debe ser una cadena de texto' })
  direccion?: string;
}