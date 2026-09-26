import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { DescuentoController } from '../controller/DescuentoController.js';
import { CreateDescuentoDto } from '../dto/CreateDescuentoDto.js';
import { UpdateDescuentoDto } from '../dto/UpdateDescuentoDto.js';
import { CreateAplicacionDto } from '../dto/CreateAplicacionDto.js';

const router = Router();
const ctrl = new DescuentoController();

router.get('/', ctrl.findAll);
router.get('/:id', ctrl.findById);
router.post('/', authenticate, authorize('ADMIN'), validateDto(CreateDescuentoDto), ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), validateDto(UpdateDescuentoDto), ctrl.update);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.softDelete);
router.post('/:id/aplicaciones', authenticate, authorize('ADMIN'), validateDto(CreateAplicacionDto), ctrl.addAplicacion);
router.delete('/:id/aplicaciones/:aplicacionId', authenticate, authorize('ADMIN'), ctrl.removeAplicacion);

export default router;
