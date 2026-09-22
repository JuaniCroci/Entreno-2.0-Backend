import { Router } from 'express';
import { HealthController } from './HealthController.js';

const router = Router();
const ctrl = new HealthController();

router.get('/', ctrl.get);

export default router;
