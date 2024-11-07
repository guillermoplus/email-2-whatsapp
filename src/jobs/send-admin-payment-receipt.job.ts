import {CronJob} from "cron";
import {OutlookService} from "../services/outlook.service";
import {dependencyContainer} from "../index";
import {TokenRepository} from "../database/repositories/token.repository";
import puppeteer from "puppeteer";
import {WhatsAppService} from "../services/whatsapp.service";
import environment from "../config/environment";
import {MessageRepository} from "../database/repositories/message.repository";
import {MessageStatus} from "../database/entities/message.entity";

export const sendAdminPaymentReceiptJobFactory = () => {
  const cronTime = environment().cronTime.sendAdminPaymentReceipt;
  return CronJob.from({
    // cronTime: '00 59 11 05 * *', // Run on every 05 of each month at 11:59:00 AM.
    cronTime: cronTime,
    onTick: async (onComplete) => {
      const env = environment();
      console.log('::: Send Admin Payment Receipt job is running...');
      try {
        const whatsappService = dependencyContainer.resolve<WhatsAppService>('whatsappService');
        const outlookService = dependencyContainer.resolve<OutlookService>('outlookService');
        const tokenRepository = dependencyContainer.resolve<TokenRepository>('tokenRepository');
        const messageRepository = dependencyContainer.resolve<MessageRepository>('messageRepository');

        const monthMessages = await messageRepository.findMessagesByMonth(new Date().getMonth() + 1);
        const messageAlreadySentThisMonth = monthMessages.some(m => m.phone_number === env.whatsapp.destinationPhoneNumber);

        if (messageAlreadySentThisMonth) {
          console.log('Admin payment receipt already sent this month.');
          return;
        }

        if (!whatsappService.isAuthenticated) {
          console.error('WhatsApp client is not connected.');
          return;
        }

        const latestToken = await tokenRepository.getLatestToken();
        const accessToken = latestToken?.access_token;
        if (!accessToken) {
          console.error('User account is not authenticated. Go to /api/outlook/login to authenticate.');
          return;
        }
        outlookService.setGetToken(async () => {
          return accessToken;
        })
        const now = new Date();
        const emails = await outlookService.findEmails({
          dateRange: {
            from: new Date(`${now.getFullYear()}-${now.getMonth() + 1}-01 00:00:00`),
            to: new Date(`${now.getFullYear()}-${now.getMonth() + 1}-10 23:59:59`),
          },
          contentContains: process.env.SEARCH_KEYWORD,
        })
        if (!emails?.length) {
          console.log('No emails found with the specified keyword in the content.');
          return;
        }
        saveContentAsHtml(emails[0].body.content);
        await convertHtmlToImage('tmp/email.html', 'tmp/email.png');

        const monthName = new Intl.DateTimeFormat('es', {month: 'long'}).format(now);
        const caption = env.whatsapp.caption || `Buen día, comparto el comprobante de pago de ${monthName}-${now.getFullYear()}.`;
        const phoneNumber = env.whatsapp.destinationPhoneNumber;

        await whatsappService.sendImage(phoneNumber, 'tmp/email.png', caption);
        await messageRepository.save({
          status: MessageStatus.SENT,
          sent_at: new Date(),
          message: caption,
          phone_number: phoneNumber,
        });
      } catch (e: any) {
        if (e.code === 'InvalidAuthenticationToken') {
          console.error('User account is not authenticated. Go to /api/outlook/login to authenticate.');
          return;
        }
        console.error('::: Error in Send Admin Payment Receipt job:', e);
      } finally {
        onComplete();
      }
    },
    onComplete: () => {
      console.log('::: Send Admin Payment Receipt job has finished!');
    },
    start: true,
    timeZone: 'America/Bogota',
  })
}

/**
 * Save content as HTML file
 */
const saveContentAsHtml = (content: string) => {
  const fs = require('fs');
  fs.writeFileSync('./tmp/email.html', content);
  console.log('Email content saved as email.html');
}

/**
 * Convert HTML to image using Puppeteer
 */
const convertHtmlToImage = async (htmlPath: string, imagePath: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // Load the HTML content
  await page.goto(`file://${process.cwd()}/${htmlPath}`, {waitUntil: 'networkidle0'});

  // Set the viewport to capture the whole page
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  await page.setViewport(dimensions);

  // Take a screenshot and save it as an image
  await page.screenshot({path: imagePath, fullPage: true});

  console.log(`HTML converted to image and saved as ${imagePath}`);

  await browser.close();
};
