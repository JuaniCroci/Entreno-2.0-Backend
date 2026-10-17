import type { Request, Response } from 'express';
import { PedidoService } from '../service/PedidoService.js';
import type { Usuario } from '../../usuarios/entity/Usuario.js';
import type { EstadoPedido } from '../entity/Pedido.js';
import type { FilterPedidoAdminDto } from '../dto/FilterPedidoAdminDto.js';

export class PedidoController {
  private service = new PedidoService();

  listMine = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const result = await this.service.listByUsuario(usuarioId);
    res.json(result);
  };

  listAdmin = async (req: Request, res: Response): Promise<void> => {
    const filters: FilterPedidoAdminDto = {
      desde: req.query.desde as string | undefined,
      hasta: req.query.hasta as string | undefined,
      estado: req.query.estado as EstadoPedido | undefined,
      idCliente: req.query.idCliente !== undefined ? Number(req.query.idCliente) : undefined,
      cliente: req.query.cliente as string | undefined,
      page: req.query.page !== undefined ? Number(req.query.page) : 1,
      size: req.query.size !== undefined ? Number(req.query.size) : 20,
    };
    const result = await this.service.listAdmin(filters);
    res.json(result);
  };

  getByIdAdmin = async (req: Request, res: Response): Promise<void> => {
    const detalle = await this.service.getByIdAdmin(Number(req.params.id));
    res.json(detalle);
  };

  getByIdOwn = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const detalle = await this.service.getByIdOwn(Number(req.params.id), usuarioId);
    res.json(detalle);
  };

  entregar = async (req: Request, res: Response): Promise<void> => {
    const detalle = await this.service.entregar(Number(req.params.id));
    res.json(detalle);
  };

  cancelar = async (req: Request, res: Response): Promise<void> => {
    const detalle = await this.service.cancelar(Number(req.params.id));
    res.json(detalle);
  };

  historial = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.historial(Number(req.params.id));
    res.json(result);
  };
}
