import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'email debe ser un email válido' })
  email!: string;

  @IsString({ message: 'password debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'password no debe estar vacío' })
  password!: string;
}
