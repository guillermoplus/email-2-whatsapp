import { Client } from '@microsoft/microsoft-graph-client';
import dotenv from 'dotenv';

dotenv.config();

const getGraphClient = () => {
  return Client.init({
    authProvider: (done) => {
      done(null, process.env.OUTLOOK_ACCESS_TOKEN); // Token de acceso de Outlook
    },
  });
};

export const searchEmailsByKeyword = async (keyword: string) => {
  try {
    const client = getGraphClient();
    const response = await client.api('/me/messages').get();
    const emails = response.value;

    return emails.filter((email: any) =>
      email.body.content.includes(keyword)
    );
  } catch (error) {
    console.error('Error buscando correos:', error);
    throw error;
  }
};
