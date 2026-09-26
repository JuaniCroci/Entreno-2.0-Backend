import type { Request, Response } from 'express';
import { TipoProductoService, type FindAllResult } from '../service/TipoProductoService.js';
import type { CreateTipoProductoDto } from '../dto/CreateTipoProductoDto.js';
import type { UpdateTipoProductoDto } from '../dto/UpdateTipoProductoDto.js';

export class TipoProductoController {
  private service = new TipoProductoService();

  list = async (req: Request, res: Response): Promise<void> => {
    const includeInactive = req.query.includeInactive === 'true';
    const result: FindAllResult = await this.service.list(includeInactive);
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const tipo = await this.service.getById(id);
    res.json(tipo);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const tipo = await this.service.create(req.body as CreateTipoProductoDto);
    res.status(201).json(tipo);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const tipo = await this.service.update(id, req.body as UpdateTipoProductoDto);
    res.json(tipo);
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await this.service.softDelete(id);
    res.status(204).send();
  };
}