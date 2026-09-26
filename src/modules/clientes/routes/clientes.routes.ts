import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { ClienteController } from '../controller/ClienteController.js';
import { CreateClienteDto } from '../dto/CreateClienteDto.js';
import { UpdateClienteDto } from '../dto/UpdateClienteDto.js';

const router = Router();
const ctrl = new ClienteController();

router.get('/', authenticate, authorize('ADMIN'), ctrl.list);
router.get('/:id', authenticate, authorize('ADMIN'), ctrl.getById);
router.post('/', authenticate, authorize('ADMIN'), validateDto(CreateClienteDto), ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), validateDto(UpdateClienteDto), ctrl.update);
router.patch('/:id/activar', authenticate, authorize('ADMIN'), ctrl.activar);
router.patch('/:id/desactivar', authenticate, authorize('ADMIN'), ctrl.desactivar);

export default router;