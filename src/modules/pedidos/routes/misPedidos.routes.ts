import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { PedidoController } from '../controller/PedidoController.js';

const router = Router();
const ctrl = new PedidoController();

router.get('/', authenticate, ctrl.listMine);

export default router;
