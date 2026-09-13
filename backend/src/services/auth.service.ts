export class AuthService {
  private readonly TENANT_ID: string;
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  private readonly SCOPE: string;
  private readonly AUTH_URL: string;
  private readonly TOKEN_URL: string;

  constructor() {
    this.TENANT_ID = process.env.AZURE_TENANT_ID ?? '';
    this.CLIENT_ID = process.env.AZURE_CLIENT_ID ?? '';
    this.CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET ?? '';
    this.REDIRECT_URI = process.env.AZURE_REDIRECT_URI ?? '';
    this.SCOPE = process.env.OUTLOOK_SCOPE ?? '';
    this.AUTH_URL = process.env.OUTLOOK_AUTH_URL ?? '';
    this.TOKEN_URL = process.env.OUTLOOK_TOKEN_URL ?? '';
  }

  /**
   * Resume una respuesta del endpoint de token sin volcar credenciales.
   * El cuerpo trae access_token y refresh_token: nunca debe loguearse entero.
   */
  private describeTokenResponse(status: number, data: any) {
    if (data?.error) {
      return `HTTP ${status} ${data.error}: ${data.error_description ?? ''}`.trim();
    }
    if (data?.access_token) {
      return `HTTP ${status} ok (token_type=${data.token_type}, expires_in=${data.expires_in}s, scope=${data.scope})`;
    }
    return `HTTP ${status} respuesta sin access_token ni error`;
  }

  getAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      response_type: 'code',
      redirect_uri: this.REDIRECT_URI,
      response_mode: 'query',
      scope: this.SCOPE,
      state,
    })
    return `${this.AUTH_URL}?${params.toString()}`;
  }

  async getToken(code: string) {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      scope: this.SCOPE,
      code,
      redirect_uri: this.REDIRECT_URI,
      grant_type: 'authorization_code',
      client_secret: this.CLIENT_SECRET,
    });
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await response.json();
    console.log('getToken:', this.describeTokenResponse(response.status, data));
    return data;
  }

  async refreshToken(refreshToken: string) {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      scope: this.SCOPE,
      refresh_token: refreshToken,
      redirect_uri: this.REDIRECT_URI,
      grant_type: 'refresh_token',
      client_secret: this.CLIENT_SECRET,
    });
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await response.json();
    console.log('refreshToken:', this.describeTokenResponse(response.status, data));
    return data;
  }

  async validateToken(token: string) {
    const params = new URLSearchParams({
      token,
    });
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await response.json();
    console.log('validateToken:', this.describeTokenResponse(response.status, data));
    return data;
  }
}
