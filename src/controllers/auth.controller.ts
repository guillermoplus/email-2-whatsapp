import {AuthService} from "../services/auth.service";

export class AuthController {
  private readonly _authService: AuthService;

  constructor(opts: any) {
    this._authService = opts.authService;
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
