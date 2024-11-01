import {Client, LocalAuth, MessageMedia} from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

export class WhatsAppService {
  private _client: Client;

  constructor() {
    this._client = new Client({
      authStrategy: new LocalAuth(), // Mantiene la sesión activa entre reinicios
      puppeteer: {
        headless: true,
      }
    });

    this.initialize();
  }

  /**
   * Inicializa el cliente de WhatsApp Web.
   */
  private initialize() {
    this._client.on('qr', (qr) => {
      qrcode.generate(qr, {small: true});
      console.log('Scan the QR code with your phone to authenticate the WhatsApp client');
    });

    this._client.on('ready', () => {
      console.log('WhatsApp client is ready');
    });

    this._client.on('authenticated', () => {
      console.log('WhatsApp client authenticated');
    });

    this._client.on('auth_failure', (message) => {
      console.error('WhatsApp authentication failure:', message);
    });

    this._client.on('disconnected', (reason) => {
      console.error(`WhatsApp client disconnected: ${reason}`);
      this._client.initialize(); // Reintenta la conexión automáticamente
    });

    this._client.initialize();
  }

  /**
   * Envía una imagen por WhatsApp.
   * @param recipient - Número de teléfono en formato internacional (ej: '3001234567').
   * @param imagePath - Ruta de la imagen que se enviará.
   * @param caption - Texto opcional que acompaña la imagen.
   */
  async sendImage(recipient: string, imagePath: string, caption: string = '') {
    try {
      if (!this._client.info?.wid) {
        throw new Error('WhatsApp client is not connected.');
      }

      const phoneNumber = this.formatPhoneNumberForWhatsapp(recipient);
      const media = MessageMedia.fromFilePath(imagePath);

      await this._client.sendMessage(phoneNumber, media, {caption});
      console.log(`Image sent to ${recipient}`);
    } catch (error: any) {
      console.error('Error sending image:', error);
    }
  }

  /**
   * Formatea el número de teléfono para WhatsApp.
   * Valida que el número de teléfono tenga al menos 10 dígitos.
   * Limpiar cualquier caracter que no sea un dígito.
   * @param phoneNumber - Número de teléfono en formato internacional (ej: '573001234567').
   * @private
   */
  private formatPhoneNumberForWhatsapp(phoneNumber: string) {
    if (phoneNumber.length < 10) {
      throw new Error('Invalid phone number. It must have at least 10 digits.');
    }
    return phoneNumber.replace(/[^0-9]/g, '');
  }
}
