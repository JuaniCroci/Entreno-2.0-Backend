import type { Request, Response } from 'express';
import { CarritoService } from '../service/CarritoService.js';
import { PedidoService } from '../../pedidos/service/PedidoService.js';
import type { AddItemDto } from '../dto/AddItemDto.js';
import type { UpdateItemDto } from '../dto/UpdateItemDto.js';
import type { Usuario } from '../../usuarios/entity/Usuario.js';

export class CarritoController {
  private service = new CarritoService();
  private pedidoService = new PedidoService();

  getOrCreate = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const { carrito, creado } = await this.service.getOrCreateActivo(usuarioId);
    res.status(creado ? 201 : 200).json(this.service.toView(carrito));
  };

  getView = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const view = await this.service.getView(usuarioId);
    res.json(view);
  };

  addItem = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const { view, creada } = await this.service.addItem(usuarioId, req.body as AddItemDto);
    res.status(creada ? 201 : 200).json(view);
  };

  updateItem = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const itemId = Number(req.params.id);
    const view = await this.service.updateItem(usuarioId, itemId, req.body as UpdateItemDto);
    res.json(view);
  };

  removeItem = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const itemId = Number(req.params.id);
    await this.service.removeItem(usuarioId, itemId);
    res.status(204).send();
  };

  confirmar = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = (req.user as Usuario).id;
    const pedido = await this.pedidoService.confirmarDesdeCarrito(usuarioId);
    res.json(pedido);
  };
}
