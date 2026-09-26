import type { Request, Response } from 'express';
import { ProveedorService, type FindAllResult } from '../service/ProveedorService.js';
import type { CreateProveedorDto } from '../dto/CreateProveedorDto.js';
import type { UpdateProveedorDto } from '../dto/UpdateProveedorDto.js';

export class ProveedorController {
  private service = new ProveedorService();

  list = async (req: Request, res: Response): Promise<void> => {
    const includeInactive = req.query.includeInactive === 'true';
    const result: FindAllResult = await this.service.list(includeInactive);
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const proveedor = await this.service.getById(id);
    res.json(proveedor);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const proveedor = await this.service.create(req.body as CreateProveedorDto);
    res.status(201).json(proveedor);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const proveedor = await this.service.update(id, req.body as UpdateProveedorDto);
    res.json(proveedor);
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await this.service.softDelete(id);
    res.status(204).send();
  };
}