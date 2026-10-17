import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { LockMode } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { env } from '../../../config/env.js';
import { Producto } from '../entity/Producto.js';
import { FotoProducto, type FotoProductoAdmin } from '../entity/FotoProducto.js';
import type { UploadFotoProductoDto } from '../dto/UploadFotoProductoDto.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  [
    'image/png',
    {
      extension: 'png',
      signature: (buffer: Buffer) =>
        buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    },
  ],
  [
    'image/jpeg',
    {
      extension: 'jpg',
      signature: (buffer: Buffer) =>
        buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    },
  ],
  [
    'image/webp',
    {
      extension: 'webp',
      signature: (buffer: Buffer) =>
        buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
    },
  ],
]);

export interface ArchivoFotoProducto {
  absolutePath: string;
  mimeType: string;
}

export class FotoProductoService {
  private get em(): EntityManager {
    return getEm();
  }

  private get storageDirectory(): string {
    return resolve(env.productImagesDir);
  }

  async upload(
    productId: number,
    file: Express.Multer.File | undefined,
    dto: UploadFotoProductoDto,
  ): Promise<FotoProductoAdmin> {
    if (!Number.isInteger(productId) || productId <= 0) throw new AppError(400, 'ID inválido');
    if (!file) throw new AppError(400, 'Seleccioná un archivo de imagen');
    if (file.size > MAX_FILE_SIZE) throw new AppError(413, 'La imagen no puede superar los 5 MiB');

    const imageType = ALLOWED_TYPES.get(file.mimetype);
    if (!imageType || !imageType.signature(file.buffer)) {
      throw new AppError(400, 'El archivo debe ser una imagen PNG, JPEG o WebP válida');
    }

    const product = await this.em.findOne(Producto, { id: productId });
    if (!product) throw new AppError(404, 'Producto no encontrado');

    const id = randomUUID();
    const nombreArchivo = `${id}.${imageType.extension}`;
    const absolutePath = join(this.storageDirectory, nombreArchivo);
    await mkdir(this.storageDirectory, { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: 'wx' });

    try {
      return await this.em.transactional(async (tx) => {
        const lockedProduct = await tx.findOne(
          Producto,
          { id: productId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );
        if (!lockedProduct) throw new AppError(404, 'Producto no encontrado');

        const imagenesPrevias = await tx.find(FotoProducto, {
          producto: productId,
          esPrincipal: true,
        });
        for (const imagen of imagenesPrevias) imagen.esPrincipal = false;

        const imagen = tx.create(FotoProducto, {
          id,
          producto: lockedProduct,
          nombreArchivo,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          altText: dto.altText.trim(),
          fuente: dto.fuente.trim(),
          licencia: dto.licencia.trim(),
          atribucion: dto.atribucion?.trim() || null,
          esPrincipal: true,
          createdAt: new Date(),
        });
        await tx.flush();
        return imagen.toAdmin();
      });
    } catch (error) {
      try {
        await unlink(absolutePath);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'No se pudo registrar la imagen y tampoco se pudo limpiar el archivo temporal',
        );
      }
      throw error;
    }
  }

  async list(productId: number): Promise<FotoProductoAdmin[]> {
    if (!Number.isInteger(productId) || productId <= 0) throw new AppError(400, 'ID inválido');
    const product = await this.em.findOne(Producto, { id: productId });
    if (!product) throw new AppError(404, 'Producto no encontrado');
    const imagenes = await this.em.find(
      FotoProducto,
      { producto: productId },
      { orderBy: { createdAt: 'DESC' } },
    );
    return imagenes.map((imagen) => imagen.toAdmin());
  }

  async findFile(id: string): Promise<ArchivoFotoProducto> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new AppError(404, 'Imagen no encontrada');
    }
    const image = await this.em.findOne(FotoProducto, { id });
    if (!image) throw new AppError(404, 'Imagen no encontrada');

    const fileName = basename(image.nombreArchivo);
    if (fileName !== image.nombreArchivo) throw new AppError(404, 'Imagen no encontrada');
    return {
      absolutePath: join(this.storageDirectory, fileName),
      mimeType: image.mimeType,
    };
  }
}
