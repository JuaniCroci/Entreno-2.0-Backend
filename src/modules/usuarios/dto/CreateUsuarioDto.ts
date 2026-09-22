import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Rol } from '../entity/Usuario.js';

export class CreateUsuarioDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre no debe estar vacío' })
  nombre!: string;

  @IsEmail({}, { message: 'email debe ser un email válido' })
  email!: string;

  @IsString({ message: 'password debe ser una cadena de texto' })
  @MinLength(6, { message: 'password debe tener al menos 6 caracteres' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'telefono debe ser una cadena de texto' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'direccion debe ser una cadena de texto' })
  direccion?: string;

  @IsOptional()
  rol?: Rol;
}
