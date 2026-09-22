import type { Request, Response } from 'express';
import { AuthService } from '../service/AuthService.js';
import { UsuarioService } from '../../usuarios/service/UsuarioService.js';
import type { RegisterDto } from '../dto/RegisterDto.js';
import type { LoginDto } from '../dto/LoginDto.js';

export class AuthController {
  private service = new AuthService();
  private usuarioService = new UsuarioService();

  register = async (req: Request, res: Response): Promise<void> => {
    const usuario = await this.service.register(req.body as RegisterDto);
    res.status(201).json(usuario);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(req.body as LoginDto);
    res.status(200).json(result);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ statusCode: 401, message: 'No autenticado' });
      return;
    }
    const publicUser = this.usuarioService.toPublic(req.user);
    res.json(this.service.me(publicUser));
  };
}
