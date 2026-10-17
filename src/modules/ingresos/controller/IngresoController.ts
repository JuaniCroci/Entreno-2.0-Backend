import type { Request, Response } from 'express';
import { IngresoService, type FindAllResult } from '../service/IngresoService.js';
import type { CreateIngresoDto } from '../dto/CreateIngresoDto.js';
import type { FilterIngresoDto } from '../dto/FilterIngresoDto.js';

export class IngresoController {
  private service = new IngresoService();

  findAll = async (req: Request, res: Response): Promise<void> => {
    const filters = req.query as unknown as FilterIngresoDto;
    const result: FindAllResult = await this.service.findAll(filters);
    res.json(result);
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const ingreso = await this.service.findById(id);
    res.json(ingreso);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ingreso = await this.service.create(req.body as CreateIngresoDto);
    res.status(201).json(ingreso);
  };

  anular = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const ingreso = await this.service.anular(id);
    res.json(ingreso);
  };
}
