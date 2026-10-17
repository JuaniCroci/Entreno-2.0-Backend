import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate.js';
import { validateDto } from '../../../common/middleware/validate.js';
import { CarritoController } from '../controller/CarritoController.js';
import { AddItemDto } from '../dto/AddItemDto.js';
import { UpdateItemDto } from '../dto/UpdateItemDto.js';

const router = Router();
const ctrl = new CarritoController();

router.get('/', authenticate, ctrl.getView);
router.post('/', authenticate, ctrl.getOrCreate);
router.post('/items', authenticate, validateDto(AddItemDto), ctrl.addItem);
router.put('/items/:id', authenticate, validateDto(UpdateItemDto), ctrl.updateItem);
router.delete('/items/:id', authenticate, ctrl.removeItem);
router.post('/confirmar', authenticate, ctrl.confirmar);

export default router;
