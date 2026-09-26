import type { Request, Response } from 'express';
import { MarcaService, type FindAllResult } from '../service/MarcaService.js';
import type { CreateMarcaDto } from '../dto/CreateMarcaDto.js';
import type { UpdateMarcaDto } from '../dto/UpdateMarcaDto.js';

export class MarcaController {
  private service = new MarcaService();

  list = async (req: Request, res: Response): Promise<void> => {
    const includeInactive = req.query.includeInactive === 'true';
    const result: FindAllResult = await this.service.list(includeInactive);
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const marca = await this.service.getById(id);
    res.json(marca);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const marca = await this.service.create(req.body as CreateMarcaDto);
    res.status(201).json(marca);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const marca = await this.service.update(id, req.body as UpdateMarcaDto);
    res.json(marca);
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await this.service.softDelete(id);
    res.status(204).send();
  };
}