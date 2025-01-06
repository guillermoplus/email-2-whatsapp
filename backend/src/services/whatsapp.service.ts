import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export class WhatsAppService {
  private _client: Client;
  private _qrCodeImage: string = '';
  private _isAuthenticated: boolean = false;
  private _reconnectionAttempts = 0;
  private readonly _maxReconnectionAttempts = 5;

  constructor() {
    this._client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        // args: ['--no-sandbox', '--disable-setuid-sandbox'], // TODO: Remove it because this generate problems
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      },
    });

    this.setClientEventHandlers().then(() => {
      this.initialize().then();
    });
  }

  get isAuthenticated() {
    return this._isAuthenticated;
  }

  get qrCodeImage() {
    return this._qrCodeImage;
  }

  async sendImage(recipient: string, imagePath: string, caption: string = '') {
    if (!this._isAuthenticated) {
      console.error('Client not authenticated. Unable to send image.');
      return;
    }

    try {
      const phoneNumber = this.formatPhoneNumberForWhatsapp(recipient);
      const media = MessageMedia.fromFilePath(imagePath);
      await this._client.sendMessage(phoneNumber, media, { caption });
      console.log(`Image sent to ${recipient}`);
    } catch (error) {
      console.error('Error sending image:', error);
    }
  }

  private formatPhoneNumberForWhatsapp(phoneNumber: string) {
    if (phoneNumber.length < 10) {
      throw new Error('Invalid phone number. It must have at least 10 digits.');
    }
    const phone = phoneNumber.replace(/[^0-9]/g, '');
    const formattedPhone = `${phone}@c.us`;
    console.log(`Phone ${phoneNumber} formatted as ${formattedPhone}`);
    return formattedPhone;
  }

  async setClientEventHandlers() {
    this._client.on('qr', (qr) => {
      QRCode.toDataURL(qr)
        .then((uri) => {
          this._qrCodeImage = uri;
        })
        .catch((error) => {
          console.error('Error generating QR code as image:', error);
        });
      console.log('Scan the QR code with your phone to authenticate the WhatsApp client');
    });

    this._client.on('ready', () => {
      this._isAuthenticated = true;
      console.log('WhatsApp client is ready and authenticated!');
      this._reconnectionAttempts = 0; // Reset reconnection attempts
    });

    this._client.on('authenticated', () => {
      console.log('WhatsApp client authenticated!');
      this._isAuthenticated = true;
    });

    this._client.on('auth_failure', (message) => {
      this._isAuthenticated = false;
      console.error('WhatsApp authentication failure:', message);
    });

    this._client.on('disconnected', async (reason) => {
      this._isAuthenticated = false;
      console.error(`WhatsApp client disconnected: ${reason}`);
      this._reconnectionAttempts++;
      if (this._reconnectionAttempts <= this._maxReconnectionAttempts) {
        console.log(`Reconnection attempt ${this._reconnectionAttempts}`);
        await this.initialize();
      } else {
        console.error('Max reconnection attempts reached. Please check the service manually.');
      }
    });
  }

  async initialize() {
    this.clearSession();
    await this._client.initialize();
  }

  private clearSession() {
    if (this._client.pupBrowser) {
      this._client?.destroy().then();
    }
    this._isAuthenticated = false;
    this._qrCodeImage = '';

    const sessionPath = path.join('/app', '.wwebjs_auth', 'session');

    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
}
