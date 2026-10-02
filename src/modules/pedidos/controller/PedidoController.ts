import type { Request, Response } from 'express';
import { PedidoService } from '../service/PedidoService.js';
import type { Usuario } from '../../usuarios/entity/Usuario.js';

export class PedidoController {
  private service = new PedidoService();

  listMine = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const result = await this.service.listByUsuario(usuarioId);
    res.json(result);
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
