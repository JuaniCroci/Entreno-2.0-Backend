import { EntityManager } from '@mikro-orm/mysql';
import { randomBytes, createHash } from 'crypto';
import { getEm } from '../../config/db.js';

export class RefreshTokenService {
  private get em(): EntityManager {
    return getEm();
  }

  async create(
    userId: number,
    ttlMs: number = 30 * 60 * 1000,
  ): Promise<{ token: string; hash: string }> {
    const token = randomBytes(64).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + ttlMs);
    const now = new Date();

    await this.em
      .getConnection()
      .execute(
        `INSERT INTO refresh_token (usuario_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)`,
        [
          userId,
          hash,
          expiresAt.toISOString().slice(0, 19).replace('T', ' '),
          now.toISOString().slice(0, 19).replace('T', ' '),
        ],
      );
    return { token, hash };
  }

  async findActiveByHash(hash: string): Promise<{ id: number; usuarioId: number } | null> {
    const rows = await this.em
      .getConnection()
      .execute(
        `SELECT id, usuario_id FROM refresh_token WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
        [hash],
      );
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, usuarioId: row.usuario_id };
  }

  async revokeAllByUserId(userId: number): Promise<void> {
    await this.em
      .getConnection()
      .execute(
        `UPDATE refresh_token SET revoked_at = NOW() WHERE usuario_id = ? AND revoked_at IS NULL`,
        [userId],
      );
  }

  async revokeById(id: number): Promise<void> {
    await this.em
      .getConnection()
      .execute(`UPDATE refresh_token SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL`, [
        id,
      ]);
  }
}
