import type { NextFunction, Request, Response } from 'express';
import { AppError } from './AppError.js';
import { env } from '../../config/env.js';

interface ErrorBody {
  statusCode: number;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ErrorBody = { statusCode: err.statusCode, message: err.message };
    if (err.details) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  console.error(err);

  const isDev = env.nodeEnv !== 'production';
  const message = err instanceof Error && isDev ? err.message : 'Error interno del servidor';
  res.status(500).json({ statusCode: 500, message });
}
