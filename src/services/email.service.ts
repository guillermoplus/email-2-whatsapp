import {ImapFlow, ImapFlowOptions} from "imapflow";

export class EmailService {
  private client: ImapFlow;

  constructor(options: ImapFlowOptions) {
    this.client = new ImapFlow(options);
  }

  async connect() {
    console.log('Conectando al servidor IMAP del correo ' + process.env.IMAP_USER);
    await this.client.connect();
    console.log('Conectado al servidor IMAP.');
  }

  async searchInbox(keyword: string) {
    // Bloquea el acceso al buzón INBOX
    let lock = await this.client.getMailboxLock('INBOX');
    try {
      console.log(`Buscando correos con el término: ${keyword}`);

      // Buscar todos los correos que contienen el keyword en el asunto
      for await (let message of this.client.fetch('1:*', {envelope: true})) {
        if (message.envelope.subject?.includes(keyword)) {
          console.log(`Correo encontrado: ${message.envelope.subject}`);
        }
      }
    } finally {
      // Libera el lock del buzón
      lock.release();
      console.log('Se liberó el lock del INBOX.');
    }
  }

  async logout() {
    await this.client.logout();
    console.log('Desconectado del servidor IMAP.');
  }
}
