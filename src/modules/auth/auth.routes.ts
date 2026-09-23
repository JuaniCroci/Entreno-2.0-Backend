import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../common/middleware/authenticate.js';
import { validateDto } from '../../common/middleware/validate.js';
import { AuthController } from './controller/AuthController.js';
import { RegisterDto } from './dto/RegisterDto.js';
import { LoginDto } from '../../modules/usuarios/dto/LoginDto.js';
import { RefreshTokenDto } from './dto/RefreshTokenDto.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
const ctrl = new AuthController();

router.post('/register', authLimiter, validateDto(RegisterDto), ctrl.register);
router.post('/login', authLimiter, validateDto(LoginDto), ctrl.login);
router.get('/me', authenticate, ctrl.me);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh', validateDto(RefreshTokenDto), ctrl.refresh);

export default router;
