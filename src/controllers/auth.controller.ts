import {AuthService} from "../services/auth.service";
import {TokenRepository} from "../database/repositories/token.repository";

export class AuthController {
  private readonly _authService: AuthService;
  private readonly _tokenRepository: TokenRepository;

  constructor(opts: any) {
    this._authService = opts.authService;
    this._tokenRepository = opts.tokenRepository;
  }

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
      const saveResult = await this._tokenRepository.save(tokenData);
      process.env.TOKEN = token;
      res.send({
        message: 'Token retrieved and set successfully.',
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal server error.');
    }
  }
}
