import { Router, type NextFunction, type Request, type Response } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../../../common/errors/AppError.js';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { ProductoController } from '../controller/ProductoController.js';
import { CreateProductoDto } from '../dto/CreateProductoDto.js';
import { UpdateProductoDto } from '../dto/UpdateProductoDto.js';
import { UploadFotoProductoDto } from '../dto/UploadFotoProductoDto.js';

const router = Router();
const ctrl = new ProductoController();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function parseImageUpload(req: Request, res: Response, next: NextFunction): void {
  imageUpload.single('imagen')(req, res, (error: unknown) => {
    if (error instanceof MulterError) {
      const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen no puede superar los 5 MiB'
          : 'No se pudo procesar el archivo de imagen';
      next(new AppError(statusCode, message));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
}

router.get('/imagenes/:uid', ctrl.getImage);
router.get('/admin', authenticate, authorize('ADMIN'), ctrl.listAdmin);
router.get('/admin/:id', authenticate, authorize('ADMIN'), ctrl.getByIdAdmin);
router.get('/admin/:id/imagenes', authenticate, authorize('ADMIN'), ctrl.listImages);
router.get('/', ctrl.findAll);
router.get('/:id', ctrl.getByIdPublic);
router.post('/', authenticate, authorize('ADMIN'), validateDto(CreateProductoDto), ctrl.create);
router.post(
  '/admin/:id/imagenes',
  authenticate,
  authorize('ADMIN'),
  parseImageUpload,
  validateDto(UploadFotoProductoDto),
  ctrl.uploadImage,
);
router.put(
  '/admin/:id',
  authenticate,
  authorize('ADMIN'),
  validateDto(UpdateProductoDto, { forbidNonWhitelisted: false }),
  ctrl.update,
);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), ctrl.softDelete);

export default router;
