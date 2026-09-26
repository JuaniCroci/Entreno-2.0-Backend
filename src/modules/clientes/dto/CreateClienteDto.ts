import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';
import { env } from '../../../config/env.js';

export class CreateClienteDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre no debe estar vacío' })
  nombre!: string;

  @IsEmail({}, { message: 'email debe ser un email válido' })
  email!: string;

  @IsString({ message: 'password debe ser una cadena de texto' })
  @MinLength(env.passwordMinLength, { message: `password debe tener al menos ${env.passwordMinLength} caracteres` })
  password!: string;

  @IsOptional()
  @IsString({ message: 'telefono debe ser una cadena de texto' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'direccion debe ser una cadena de texto' })
  direccion?: string;
}