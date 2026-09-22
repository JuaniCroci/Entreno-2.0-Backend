import { getEm } from '../../config/db.js';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
}

export class HealthService {
  private get em() {
    return getEm();
  }

  async check(): Promise<HealthStatus> {
    try {
      await this.em.getConnection().execute('select 1');
      return { status: 'ok', database: 'up' };
    } catch {
      return { status: 'error', database: 'down' };
    }
  }
}
