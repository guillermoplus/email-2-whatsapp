export interface TokenEntity {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  ext_expires_in: number;
  created_at: Date;
}
