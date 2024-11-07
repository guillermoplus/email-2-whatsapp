import {Client, LocalAuth, MessageMedia} from 'whatsapp-web.js';
import QRCode from 'qrcode';

export class WhatsAppService {
  private _client: Client;
  private _qrCodeImage: string = '';
  private _isAuthenticated: boolean = false;

  constructor() {
    this._client = new Client({
      authStrategy: new LocalAuth(), // Keep the session in the local file system
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    });

    this.initialize();
  }

  get isAuthenticated() {
    return this._isAuthenticated;
  }

  get qrCodeImage() {
    return this._qrCodeImage;
  }

  /**
   * Send a message to a recipient.
   * @param recipient - Phone number with country code (e.g. '573001234567').
   * @param imagePath - Path to the image to send.
   * @param caption - Caption for the image.
   */
  async sendImage(recipient: string, imagePath: string, caption: string = '') {
    try {
      if (!this._client.info?.wid || !this._isAuthenticated) {
        throw new Error('WhatsApp client is not connected.');
      }

      const phoneNumber = this.formatPhoneNumberForWhatsapp(recipient);
      const media = MessageMedia.fromFilePath(imagePath);

      await this._client.sendMessage(phoneNumber, media, {caption});
      console.log(`Image sent to ${recipient}`);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Format the phone number for WhatsApp.
   * Validate if the phone number has at least 10 digits.
   * Clean the phone number from any non-numeric character.
   * @param phoneNumber - Phone number to format with country code (e.g. '573001234567').
   * @private
   */
  private formatPhoneNumberForWhatsapp(phoneNumber: string) {
    if (phoneNumber.length < 10) {
      throw new Error('Invalid phone number. It must have at least 10 digits.');
    }
    const phone = phoneNumber.replace(/[^0-9]/g, '');
    const formattedPhone = `${phone}@c.us`;
    console.log(`Phone ${phoneNumber} formatted as ${formattedPhone}`);
    return formattedPhone;
  }

  /**
   * Initialize the WhatsApp client.
   */
  public initialize() {
    this._client.on('qr', (qr) => {
      QRCode.toDataURL(qr)
        .then((uri) => {
          this._qrCodeImage = uri;
        })
        .catch((error) => {
          console.error('Error generating QR code as image:', error);
        })
      // qrcode.generate(qr, {small: true});
      console.log('Scan the QR code with your phone to authenticate the WhatsApp client');
    });

    this._client.on('ready', () => {
      console.log('WhatsApp client is ready!');
    });

    this._client.on('authenticated', () => {
      this._isAuthenticated = true;
      console.log('WhatsApp client is authenticated!');
    });

    this._client.on('auth_failure', (message) => {
      this._isAuthenticated = false;
      console.error('WhatsApp authentication failure:', message);
    });

    this._client.on('disconnected', async (reason) => {
      this._isAuthenticated = false;
      console.error(`WhatsApp client disconnected: ${reason}`);
      await this._client.initialize(); // Retry connection automatically
    });

    this._client.initialize().then();
  }
}
