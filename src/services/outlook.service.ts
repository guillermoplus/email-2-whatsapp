import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

export class OutlookService {
  private static instance: OutlookService;
  private grahpClient: Client;

  private CLIENT_ID = process.env.OUTLOOK_CLIENT_ID ?? '';
  private TENANT_ID = process.env.OUTLOOK_TENANT_ID ?? '';
  private CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET ?? '';

  private constructor() {
    const credential = new ClientSecretCredential(
      this.TENANT_ID,
      this.CLIENT_ID,
      this.CLIENT_SECRET
    );

    this.grahpClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          return token?.token ?? '';
        },
      },
    });
  }

  public static getInstance(): OutlookService {
    if (!OutlookService.instance) {
      OutlookService.instance = new OutlookService();
    }
    return OutlookService.instance;
  }

  async getUserEmails(userId: string) {
    try {
      const emails = await this.grahpClient
        .api(`/users/${userId}/messages`)
        .select('subject,sender,receivedDateTime')
        .get();

      console.log('User Emails:', emails.value);
      return emails.value;
    } catch (error) {
      console.error('Error retrieving emails:', error);
      throw new Error('Failed to retrieve emails.');
    }
  }

  async listUsers() {
    try {
      const users = await this.grahpClient.api('/users').get();
      console.log('Users:', users.value);
      return users.value;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw new Error('Failed to retrieve users.');
    }
  }
}
