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
      console.log('Escanea el QR para iniciar sesión.');
    });

    this._client.on('ready', () => {
      console.log('WhatsApp Web está listo.');
    });

    this._client.on('authenticated', () => {
      console.log('Autenticación exitosa.');
    });

    this._client.on('auth_failure', (message) => {
      console.error('Error de autenticación:', message);
    });

    this._client.on('disconnected', (reason) => {
      console.error(`Cliente desconectado: ${reason}. Intentando reiniciar...`);
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
        throw new Error('Cliente de WhatsApp no está conectado.');
      }

      const phoneNumber = this.formatPhoneNumberForColombia(recipient);
      const media = MessageMedia.fromFilePath(imagePath);

      await this._client.sendMessage(phoneNumber, media, {caption});
      console.log(`Imagen enviada a ${phoneNumber}`);
    } catch (error: any) {
      console.error('Error al enviar la imagen:', error?.message || error);
    }
  }

  /**
   * Formatea y valida el número de teléfono para WhatsApp en Colombia.
   * @param phone - Número de teléfono sin el prefijo + (ej: 3001234567).
   * @returns Número formateado para WhatsApp (ej: 573001234567@c.us).
   */
  private formatPhoneNumberForColombia(phone: string): string {
    if (!/^\d{10}$/.test(phone)) {
      throw new Error('El número de teléfono debe tener 10 dígitos.');
    }
    return `57${phone}@c.us`; // Prefijo internacional para Colombia + número
  }
}
