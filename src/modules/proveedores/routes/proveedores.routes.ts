import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { ProveedorController } from '../controller/ProveedorController.js';
import { CreateProveedorDto } from '../dto/CreateProveedorDto.js';
import { UpdateProveedorDto } from '../dto/UpdateProveedorDto.js';

const router = Router();
const ctrl = new ProveedorController();

router.get('/', authenticate, authorize('ADMIN'), ctrl.list);
router.get('/:id', authenticate, authorize('ADMIN'), ctrl.getById);
router.post('/', authenticate, authorize('ADMIN'), validateDto(CreateProveedorDto), ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), validateDto(UpdateProveedorDto), ctrl.update);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.softDelete);

export default router;