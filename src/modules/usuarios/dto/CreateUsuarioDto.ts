import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { env } from '../../../config/env.js';
import { Rol } from '../entity/Usuario.js';

export class CreateUsuarioDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre no debe estar vacío' })
  nombre!: string;

  @IsEmail({}, { message: 'email debe ser un email válido' })
  email!: string;

  @IsString({ message: 'password debe ser una cadena de texto' })
  @MinLength(env.passwordMinLength, {
    message: `password debe tener al menos ${env.passwordMinLength} caracteres`,
  })
  password!: string;

  @IsOptional()
  @IsString({ message: 'telefono debe ser una cadena de texto' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'direccion debe ser una cadena de texto' })
  direccion?: string;

  /**
   * Este campo es ignorado: el rol siempre se fuerza a `Rol.CLIENTE`
   * en `UsuarioService.create()`. No se puede crear un usuario con otro rol.
   */
  @IsOptional()
  rol?: Rol;
}
