import 'reflect-metadata';
import { AuthService } from '../services/auth.service';
import { TokenRepository } from '../database/repositories/token.repository';
import { WhatsAppService } from '../services/whatsapp.service';
import {
  BadRequestError,
  Get,
  InternalServerError,
  JsonController,
  QueryParam,
  Res,
} from 'routing-controllers';
import { Response } from 'express';
import { AUTH_ROUTE, OUTLOOK_CALLBACK_ROUTE } from '../config/routes';

@JsonController(AUTH_ROUTE)
export class AuthController {
  private readonly _authService: AuthService;
  private readonly _tokenRepository: TokenRepository;
  private readonly _whatsappService: WhatsAppService;

  constructor(opts: any) {
    this._authService = opts.authService;
    this._tokenRepository = opts.tokenRepository;
    this._whatsappService = opts.whatsappService;
  }

  @Get('/whatsapp/login')
  async whatsappLogin() {
    if (this._whatsappService.isAuthenticated) {
      return {
        message: 'WhatsApp client is already authenticated.',
      };
    }
    await this._whatsappService.initialize();
    const qrCode = this._whatsappService.qrCodeImage;
    return {
      message: 'Scan the QR code to authenticate WhatsApp',
      data: qrCode,
    };
  }

  /**
   * Redirects to the Microsoft consent screen.
   * The response object must be returned as-is: routing-controllers only skips
   * sending its own body when the action returns the very same response
   * instance, and Express 4's res.redirect() returns undefined.
   */
  @Get('/outlook/login')
  async login(@Res() res: Response) {
    const state = Math.random().toString(36).substring(7);
    const authUrl = this._authService.getAuthUrl(state);
    res.redirect(authUrl);
    return res;
  }

  @Get(OUTLOOK_CALLBACK_ROUTE)
  async callback(@QueryParam('code') code: string) {
    if (!code) {
      throw new BadRequestError('Code is required.');
    }
    const tokenData = await this._authService.getToken(code);
    const token = tokenData?.access_token;
    if (!tokenData || !token) {
      throw new InternalServerError('Failed to get token.');
    }
    await this._tokenRepository.save(tokenData);
    process.env.TOKEN = token;
    return {
      message: 'Token retrieved and set successfully!',
    };
  }
}
