import {CronJob} from "cron";
import {AzureIdentityService} from "../services/azure-identity.service";
import {EmailService} from "../services/email.service";
import {OutlookService} from "../services/outlook.service";

export const adminPaymentReceiptJobFactory = () => {
  // Run on every 05 of each month at 11:59:00 AM.
  // Run every minute
  return CronJob.from({
    // cronTime: '00 59 11 05 * *',
    cronTime: '* * * * *',
    onTick: async (onComplete) => {
      console.log('Cron job is running...');
      try {
        const token = process.env.TOKEN;
        if(!token) {
          console.error('User account is not authenticated.');
          return;
        }
        // const client = new AzureIdentityService();
        // const token = await client.getAccessToken();
        // console.log('users:', await OutlookService.getInstance().listUsers());
        // const emails = await OutlookService.getInstance().listUsers();
        const myEmails = await OutlookService.getInstance().getMyEmails();

        // const emailService = new EmailService({
        //   host: process.env.IMAP_HOST || '',
        //   port: parseInt(process.env.IMAP_PORT || '993'),
        //   secure: true,
        //   auth: {
        //     user: process.env.IMAP_USER || '',
        //     accessToken: token,
        //   },
        //   tls: {
        //     rejectUnauthorized: false,
        //   },
        // });
        // await emailService.connect();
        // await emailService.searchInbox('Payment Receipt');
        // await emailService.logout();
      } catch (e: any) {
        console.error('Error:', e);
      } finally {
        onComplete();
      }
    },
    onComplete: () => {
      console.log('Cron job has finished!');
    },
    start: true,
    timeZone: 'America/Bogota',
  })
}
