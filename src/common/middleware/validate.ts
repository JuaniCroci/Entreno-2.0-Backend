import type { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppError } from '../errors/AppError.js';

export function validateDto<T extends object>(dtoClass: new () => T) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const instance = plainToInstance(dtoClass, req.body);
      const errors = await validate(instance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length > 0) {
        const details = errors.flatMap((err) =>
          Object.values(err.constraints ?? {}).map((message) => ({
            field: err.property,
            message,
          })),
        );
        next(new AppError(400, 'Error de validación', details));
        return;
      }
      req.body = instance;
      next();
    } catch (err) {
      next(err);
    }
  };
}
