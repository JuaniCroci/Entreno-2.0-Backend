import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { PedidoController } from '../controller/PedidoController.js';

const router = Router();
const ctrl = new PedidoController();

router.get('/', authenticate, authorize('ADMIN'), ctrl.listAdmin);
router.get('/:id', authenticate, authorize('ADMIN'), ctrl.getByIdAdmin);
router.post('/:id/entregar', authenticate, authorize('ADMIN'), ctrl.entregar);
router.post('/:id/cancelar', authenticate, authorize('ADMIN'), ctrl.cancelar);
router.get('/:id/historial', authenticate, authorize('ADMIN'), ctrl.historial);

export default router;
