import {CronJob} from "cron";
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
        const users = await OutlookService.getInstance().listUsers();
        if(!users.length) {
          console.warn('No users found!');
          return;
        }
        const userId = users[0].id;
        await OutlookService.getInstance().getUserEmails(userId);
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
