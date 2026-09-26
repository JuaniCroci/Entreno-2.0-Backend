import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { TipoProductoController } from '../controller/TipoProductoController.js';
import { CreateTipoProductoDto } from '../dto/CreateTipoProductoDto.js';
import { UpdateTipoProductoDto } from '../dto/UpdateTipoProductoDto.js';

const router = Router();
const ctrl = new TipoProductoController();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, authorize('ADMIN'), validateDto(CreateTipoProductoDto), ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), validateDto(UpdateTipoProductoDto), ctrl.update);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.softDelete);

export default router;