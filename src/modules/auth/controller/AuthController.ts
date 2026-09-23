import type { Request, Response } from 'express';
import { AuthService } from '../service/AuthService.js';
import { RegisterDto } from '../dto/RegisterDto.js';
import { LoginDto } from '../../usuarios/dto/LoginDto.js';
import type { UsuarioPublic } from '../../usuarios/entity/Usuario.js';

export class AuthController {
  private service = new AuthService();

  register = async (req: Request, res: Response): Promise<void> => {
    const usuario = await this.service.register(req.body as RegisterDto);
    res.status(201).json(usuario);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(req.body as LoginDto);
    res.status(200).json(result);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    res.json(req.user as UsuarioPublic);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const userId = (req.user as UsuarioPublic).id;
    await this.service.logout(userId);
    res.status(204).send();
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.refresh((req.body as { refreshToken: string }).refreshToken);
    res.status(200).json(result);
  };
}
