import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { ProductoController } from '../controller/ProductoController.js';
import { CreateProductoDto } from '../dto/CreateProductoDto.js';
import { UpdateProductoDto } from '../dto/UpdateProductoDto.js';

const router = Router();
const ctrl = new ProductoController();

router.get('/admin', authenticate, authorize('ADMIN'), ctrl.listAdmin);
router.get('/admin/:id', authenticate, authorize('ADMIN'), ctrl.getByIdAdmin);
router.get('/:id', ctrl.getByIdPublic);
router.post('/', authenticate, authorize('ADMIN'), validateDto(CreateProductoDto), ctrl.create);
router.put('/admin/:id', authenticate, authorize('ADMIN'), validateDto(UpdateProductoDto), ctrl.update);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), ctrl.softDelete);

export default router;
