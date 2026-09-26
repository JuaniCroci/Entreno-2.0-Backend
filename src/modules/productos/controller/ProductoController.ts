import type { Request, Response } from 'express';
import { ProductoService, type FindAllResult } from '../service/ProductoService.js';
import type { CreateProductoDto } from '../dto/CreateProductoDto.js';
import type { UpdateProductoDto } from '../dto/UpdateProductoDto.js';
import type { FilterProductoAdminDto } from '../dto/FilterProductoAdminDto.js';

export class ProductoController {
  private service = new ProductoService();

  listAdmin = async (req: Request, res: Response): Promise<void> => {
    const filters: FilterProductoAdminDto = {
      nombre: req.query.nombre as string | undefined,
      idTipoProducto: req.query.idTipoProducto ? Number(req.query.idTipoProducto) : undefined,
      idMarca: req.query.idMarca ? Number(req.query.idMarca) : undefined,
      idProveedor: req.query.idProveedor ? Number(req.query.idProveedor) : undefined,
      activo: req.query.activo === 'true' ? true : req.query.inactivos === 'true' ? false : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      size: req.query.size ? Number(req.query.size) : 20,
    };
    const result: FindAllResult = await this.service.listAdmin(filters);
    res.json(result);
  };

  getByIdAdmin = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const producto = await this.service.getByIdAdmin(id);
    res.json(producto);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const producto = await this.service.create(req.body as CreateProductoDto);
    res.status(201).json(producto);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const producto = await this.service.update(id, req.body as UpdateProductoDto);
    res.json(producto);
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await this.service.softDelete(id);
    res.status(204).send();
  };

  getByIdPublic = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const producto = await this.service.getByIdPublic(id);
    res.json(producto);
  };
}
