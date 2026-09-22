import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';
import { env } from '../../config/env.js';
import { getEm } from '../../config/db.js';
import { Usuario } from '../../modules/usuarios/entity/Usuario.js';

interface JwtPayload {
  sub: number;
  rol: string;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(401, 'Token de autenticación faltante o inválido');
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.jwtSecret) as unknown as JwtPayload;
    if (typeof decoded.sub !== 'number') {
      throw new AppError(401, 'Token de autenticación faltante o inválido');
    }
    const em = getEm();
    const usuario = await em.findOne(Usuario, { id: decoded.sub, activo: true });
    if (!usuario) {
      throw new AppError(401, 'Token de autenticación faltante o inválido');
    }
    req.user = usuario;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Token de autenticación faltante o inválido'));
  }
}
