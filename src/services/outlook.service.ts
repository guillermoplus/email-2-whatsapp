import {Client} from '@microsoft/microsoft-graph-client';
import {ClientSecretCredential} from '@azure/identity';

/**
 * Filter object for email search.
 * @interface EmailFilter
 * @property {Object} dateRange - The date range for the email search.
 * @property {Date} dateRange.from - The start date.
 * @property {Date} dateRange.to - The end date.
 * @property {string} sender - The email address of the sender.
 * @property {string} subjectContains - Keyword to search in the email subject.
 * @property {string} contentContains - Keyword to search in the email content.
 */
interface EmailFilter {
  dateRange?: {
    from: Date;
    to: Date;
  },
  sender?: string;
  subjectContains?: string;
  contentContains?: string;
}

export class OutlookService {
  private _grahpClient: Client | undefined;
  private _getToken: (() => Promise<string>) | undefined;

  private CLIENT_ID = process.env.AZURE_CLIENT_ID ?? '';
  private TENANT_ID = process.env.AZURE_TENANT_ID ?? '';
  private CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET ?? '';

  constructor() {
    const credential = new ClientSecretCredential(
      this.TENANT_ID,
      this.CLIENT_ID,
      this.CLIENT_SECRET
    );
  }

  setGetToken(callback: () => Promise<string>) {
    this._getToken = callback;
  }

  private async getGraphClient() {
    if (!this._getToken) {
      throw new Error('getToken function is not set.');
    }
    if (!this._grahpClient) {
      return Client.initWithMiddleware({
        authProvider: {
          getAccessToken: this._getToken
        },
      });
    }
    return this._grahpClient;
  }

  async findEmails(filter: EmailFilter) {
    try {
      const client = await this.getGraphClient();
      const response = await client
        .api('/me/messages')
        .search(`"${filter.contentContains}"`)
        // .filter(this.buildFilterQuery(filter))
        .select('subject,sender,receivedDateTime,body')
        .get();
      return response.value;
    } catch (e) {
      console.log('Failed to retrieve emails.');
      throw e;
    }
  }

  async getUserEmails(userId: string) {
    try {
      const client = await this.getGraphClient();
      const emails = await client
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
      const client = await this.getGraphClient();
      const users = await client
        .api('/users').get();
      console.log('Users:', users.value);
      return users.value;
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw new Error('Failed to retrieve users.');
    }
  }

  /**
   * Build the filter query based on the filter object.
   * @param filter The filter object.
   * @private
   */
  private buildFilterQuery(filter: EmailFilter): string {
    const filterQueries: string[] = [];

    if (filter.dateRange) {
      const from = filter.dateRange.from.toISOString();
      const to = filter.dateRange.to.toISOString();
      filterQueries.push(`receivedDateTime ge ${from} and receivedDateTime le ${to}`);
    }

    if (filter.sender) {
      filterQueries.push(`from/emailAddress/address eq '${filter.sender}'`);
    }

    if (filter.subjectContains) {
      filterQueries.push(`contains(subject, '${filter.subjectContains}')`);
    }

    if (filter.contentContains) {
      filterQueries.push(`contains(body/content, '${filter.contentContains}')`);
    }

    return filterQueries.join(' and ');
  }
}
