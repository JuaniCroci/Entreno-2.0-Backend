import type { Request, Response } from 'express';
import { DescuentoService, type FindAllResult } from '../service/DescuentoService.js';
import type { CreateDescuentoDto } from '../dto/CreateDescuentoDto.js';
import type { UpdateDescuentoDto } from '../dto/UpdateDescuentoDto.js';
import type { CreateAplicacionDto } from '../dto/CreateAplicacionDto.js';

export class DescuentoController {
  private service = new DescuentoService();

  findAll = async (_req: Request, res: Response): Promise<void> => {
    const result: FindAllResult = await this.service.findAll();
    res.json(result);
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const descuento = await this.service.findById(id);
    res.json(descuento);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const descuento = await this.service.create(req.body as CreateDescuentoDto);
    res.status(201).json(descuento);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const descuento = await this.service.update(id, req.body as UpdateDescuentoDto);
    res.json(descuento);
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await this.service.softDelete(id);
    res.status(204).send();
  };

  addAplicacion = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const aplicacion = await this.service.addAplicacion(id, req.body as CreateAplicacionDto);
    res.status(201).json(aplicacion);
  };

  removeAplicacion = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const aplicacionId = Number(req.params.aplicacionId);
    await this.service.removeAplicacion(id, aplicacionId);
    res.status(204).send();
  };
}
