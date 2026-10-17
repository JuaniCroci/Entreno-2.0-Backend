import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'refreshToken debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'refreshToken no debe estar vacío' })
  refreshToken!: string;
}
