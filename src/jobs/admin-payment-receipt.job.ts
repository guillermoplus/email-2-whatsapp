import {CronJob} from "cron";

export const adminPaymentReceiptJobFactory = () => {
  // Run on every 05 of each month at 11:59:00 AM.
  // Run every minute
  return CronJob.from({
    // cronTime: '00 59 11 05 * *',
    cronTime: '* * * * *',
    onTick: (onComplete) => {
      console.log('Cron job is running...');
      // Sleep for 5 seconds
      setTimeout(() => {
        onComplete();
      }, 5000);
    },
    onComplete: () => {
      console.log('Cron job has finished!');
    },
    start: true,
    timeZone: 'America/Bogota',
  })
}
