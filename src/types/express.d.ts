import type { Usuario } from '../modules/usuarios/entity/Usuario.js';

declare global {
  namespace Express {
    interface Request {
      user?: Usuario;
    }
  }
}

export {};
