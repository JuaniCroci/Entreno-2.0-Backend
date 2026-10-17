import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { IngresoController } from '../controller/IngresoController.js';
import { CreateIngresoDto } from '../dto/CreateIngresoDto.js';

const router = Router();
const ctrl = new IngresoController();

router.get('/', authenticate, authorize('ADMIN'), ctrl.findAll);
router.get('/:id', authenticate, authorize('ADMIN'), ctrl.findById);
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateDto(CreateIngresoDto, { forbidNonWhitelisted: false }),
  ctrl.create,
);
router.post('/:id/anular', authenticate, authorize('ADMIN'), ctrl.anular);

export default router;
