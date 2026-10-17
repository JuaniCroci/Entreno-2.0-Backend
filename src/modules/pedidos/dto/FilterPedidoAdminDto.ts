import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ESTADOS_PEDIDO, type EstadoPedido } from '../entity/Pedido.js';

export class FilterPedidoAdminDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener formato YYYY-MM-DD' })
  @IsOptional()
  desde?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener formato YYYY-MM-DD' })
  @IsOptional()
  hasta?: string;

  @IsIn(ESTADOS_PEDIDO, {
    message: 'estado debe ser REALIZADO, ABONADO, ENTREGADO o CANCELADO',
  })
  @IsOptional()
  estado?: EstadoPedido;

  @IsInt()
  @Min(1)
  @IsOptional()
  idCliente?: number;

  @IsString()
  @IsOptional()
  cliente?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  size?: number;
}
