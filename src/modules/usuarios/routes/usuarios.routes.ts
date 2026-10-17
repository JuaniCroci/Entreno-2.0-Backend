import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { authorize } from '../../../common/middleware/authorize.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { UsuarioController } from '../controller/UsuarioController.js';
import { CreateUsuarioDto } from '../dto/index.js';
import { Rol } from '../entity/Usuario.js';

const router = Router();
const ctrl = new UsuarioController();

router.get('/', authenticate, authorize(Rol.ADMIN), ctrl.list);
router.get('/:id', authenticate, authorize(Rol.ADMIN), ctrl.getById);
router.post('/', authenticate, authorize(Rol.ADMIN), validateDto(CreateUsuarioDto), ctrl.create);

export default router;
