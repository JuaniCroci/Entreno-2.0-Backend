import type { Request, Response } from 'express';
import { ClienteService, type FindAllResult } from '../service/ClienteService.js';
import type { CreateClienteDto } from '../dto/CreateClienteDto.js';
import type { UpdateClienteDto } from '../dto/UpdateClienteDto.js';

export class ClienteController {
  private service = new ClienteService();

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query.q as string | undefined;
    const activo = req.query.activo ? req.query.activo === 'true' : undefined;
    const result: FindAllResult = await this.service.list({ q, activo });
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const cliente = await this.service.getById(id);
    res.json(cliente);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const cliente = await this.service.create(req.body as CreateClienteDto);
    res.status(201).json(cliente);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const cliente = await this.service.update(id, req.body as UpdateClienteDto);
    res.json(cliente);
  };

  activar = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const cliente = await this.service.setActivo(id, true);
    res.json(cliente);
  };

  desactivar = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const cliente = await this.service.setActivo(id, false);
    res.json(cliente);
  };
}