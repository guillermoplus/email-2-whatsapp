import 'reflect-metadata';
import { AuthService } from '../services/auth.service';
import { TokenRepository } from '../database/repositories/token.repository';
import { WhatsAppService } from '../services/whatsapp.service';
import { Get, JsonController } from 'routing-controllers';

@JsonController('/auth')
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
  async whatsappLogin(req: any, res: any) {
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

  @Get('/outlook/login')
  async login(req: any, res: any) {
    try {
      const state = Math.random().toString(36).substring(7);
      const authUrl = this._authService.getAuthUrl(state);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal server error.');
    }
  }

  @Get('/outlook/login/callback')
  async callback(req: any, res: any) {
    try {
      const code: string = req.query.code;
      if (!code) {
        res.status(400).send('Code is required.');
        return;
      }
      const tokenData = await this._authService.getToken(code);
      const token = tokenData?.access_token;
      if (!tokenData || !token) {
        res.status(500).send('Failed to get token.');
        return;
      }
      await this._tokenRepository.save(tokenData);
      process.env.TOKEN = token;
      res.send({
        message: 'Token retrieved and set successfully!',
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal server error.');
    }
  }
}
