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
}
