import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsDateString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateIngresoItemDto } from './CreateIngresoItemDto.js';

export class CreateIngresoDto {
  @IsString({ message: 'nroIngreso debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nroIngreso no debe estar vacío' })
  nroIngreso!: string;

  @IsInt({ message: 'idProveedor debe ser un entero' })
  @Min(1, { message: 'idProveedor debe ser mayor a 0' })
  idProveedor!: number;

  @IsDateString({}, { message: 'fecha debe ser una fecha ISO 8601 válida' })
  @IsOptional()
  fecha?: string;

  @IsArray({ message: 'lineas debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'lineas debe tener al menos 1 línea' })
  @ValidateNested({ each: true, message: 'cada línea debe ser un objeto válido' })
  @Type(() => CreateIngresoItemDto)
  lineas!: CreateIngresoItemDto[];
}
