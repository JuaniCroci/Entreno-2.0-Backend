import { IsOptional, IsIn, Matches } from 'class-validator';

export class FilterIngresoDto {
  @IsIn(['REGISTRADO', 'ANULADO'], { message: 'estado debe ser REGISTRADO o ANULADO' })
  @IsOptional()
  estado?: 'REGISTRADO' | 'ANULADO';

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener formato YYYY-MM-DD' })
  @IsOptional()
  desde?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener formato YYYY-MM-DD' })
  @IsOptional()
  hasta?: string;
}
