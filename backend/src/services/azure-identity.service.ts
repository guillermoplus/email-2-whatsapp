import {ClientSecretCredential} from '@azure/identity'

export class AzureIdentityService {
  private client: ClientSecretCredential;
  private readonly AZURE_TENANT_ID: string;
  private readonly AZURE_CLIENT_ID: string;
  private readonly AZURE_CLIENT_SECRET: string;

  constructor() {
    this.AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'your-tenant-id';
    this.AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || 'your-client-id';
    this.AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || 'your-client-secret';
    this.client = new ClientSecretCredential(this.AZURE_TENANT_ID, this.AZURE_CLIENT_ID, this.AZURE_CLIENT_SECRET);
  }

  async getAccessToken() {
    try {
      const token = await this.client.getToken(process.env.OUTLOOK_SCOPE || 'https://graph.microsoft.com/.default');
      return token?.token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw new Error('Failed to get token.');
    }
  }
}
