import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { MarcaController } from '../controller/MarcaController.js';
import { CreateMarcaDto } from '../dto/CreateMarcaDto.js';
import { UpdateMarcaDto } from '../dto/UpdateMarcaDto.js';

const router = Router();
const ctrl = new MarcaController();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, authorize('ADMIN'), validateDto(CreateMarcaDto), ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), validateDto(UpdateMarcaDto), ctrl.update);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.softDelete);

export default router;