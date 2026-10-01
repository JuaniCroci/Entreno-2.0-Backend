import { IsInt, Min } from 'class-validator';

export class UpdateItemDto {
  @IsInt({ message: 'cantidad debe ser un entero' })
  @Min(1, { message: 'cantidad debe ser al menos 1' })
  cantidad!: number;
}
