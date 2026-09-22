import type { Request, Response } from 'express';
import { UsuarioService, type FindAllResult } from '../service/UsuarioService.js';
import type { CreateUsuarioDto } from '../dto/index.js';

export class UsuarioController {
  private service = new UsuarioService();

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query.q as string | undefined;
    const activo = req.query.activo ? (req.query.activo === 'true') : undefined;
    const result: FindAllResult = await this.service.findAll({ q, activo });
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const usuario = await this.service.findById(id);
    res.json(usuario);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const usuario = await this.service.create(req.body as CreateUsuarioDto);
    res.status(201).json(usuario);
  };
}
