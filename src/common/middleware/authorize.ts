import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import type { Rol } from '../../modules/usuarios/entity/Usuario.js';

export function authorize(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'No autenticado'));
      return;
    }
    if (!roles.includes(req.user.rol)) {
      next(new AppError(403, 'No tiene permisos para realizar esta acción'));
      return;
    }
    next();
  };
}
