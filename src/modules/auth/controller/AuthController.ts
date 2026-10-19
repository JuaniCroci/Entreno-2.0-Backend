import type { Request, Response } from 'express';
import { AuthService } from '../service/AuthService.js';
import { RegisterDto } from '../dto/RegisterDto.js';
import { LoginDto } from '../../usuarios/dto/LoginDto.js';
import type { UsuarioPublic } from '../../usuarios/entity/Usuario.js';

/**
 * Request tipado por el body ya validado: `validateDto` reemplaza `req.body`
 * por la instancia del DTO antes de llegar al handler, así que no hace falta
 * castear en cada método (S11).
 */
type BodyRequest<B> = Request<Record<string, string>, unknown, B>;

export class AuthController {
  private service = new AuthService();

  register = async (req: BodyRequest<RegisterDto>, res: Response): Promise<void> => {
    const usuario = await this.service.register(req.body);
    res.status(201).json(usuario);
  };

  login = async (req: BodyRequest<LoginDto>, res: Response): Promise<void> => {
    const result = await this.service.login(req.body);
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

  refresh = async (req: BodyRequest<{ refreshToken: string }>, res: Response): Promise<void> => {
    const result = await this.service.refresh(req.body.refreshToken);
    res.status(200).json(result);
  };
}
