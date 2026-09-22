import type { Request, Response } from 'express';
import { HealthService, type HealthStatus } from './HealthService.js';

export class HealthController {
  private service = new HealthService();

  get = async (_req: Request, res: Response): Promise<void> => {
    const health: HealthStatus = await this.service.check();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  };
}
