import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.js';
import { validateDto } from '../../common/middleware/validate.js';
import { AuthController } from './controller/AuthController.js';
import { RegisterDto } from './dto/RegisterDto.js';
import { LoginDto } from './dto/LoginDto.js';

const router = Router();
const ctrl = new AuthController();

router.post('/register', validateDto(RegisterDto), ctrl.register);
router.post('/login', validateDto(LoginDto), ctrl.login);
router.get('/me', authenticate, ctrl.me);

export default router;
