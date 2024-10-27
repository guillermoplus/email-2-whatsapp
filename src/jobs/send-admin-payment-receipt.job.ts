import {CronJob} from "cron";
import {OutlookService} from "../services/outlook.service";
import {dependencyContainer} from "../index";
import {TokenRepository} from "../database/repositories/token.repository";

export const sendAdminPaymentReceiptJobFactory = () => {
  return CronJob.from({
    // cronTime: '00 59 11 05 * *', // Run on every 05 of each month at 11:59:00 AM.
    cronTime: '* * * * *', // Run every minute
    onTick: async (onComplete) => {
      console.log('::: Send Admin Payment Receipt job is running...');
      try {
        const outlookService = dependencyContainer.resolve<OutlookService>('outlookService');
        const tokenRepository = dependencyContainer.resolve<TokenRepository>('tokenRepository');
        const latestToken = await tokenRepository.getLatestToken();
        const accessToken = latestToken?.access_token;
        if (!accessToken) {
          console.error('User account is not authenticated. Go to /api/outlook/login to authenticate.');
          return;
        }
        outlookService.setGetToken(async () => {
          return accessToken;
        })
        const emails = await outlookService.findEmails({
          dateRange: {
            from: new Date('2024-10-05 00:00:00'),
            to: new Date('2024-10-05 23:59:59'),
          },
          contentContains: 'Transferiste $379,424',
        })
        if (!!emails?.length) {
          saveContentAsHtml(emails[0].body.content);
        }
        // console.log('Filtered Emails:', emails?.map((e: any) => {
        //   // return JSON.stringify(e.body);
        //   return e.body.content?.length;
        // }));
      } catch (e: any) {
        console.error('Error:', e);
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



// Contenido del mensaje a encontrar. La fecha y la hora pueden variar. Pero si o si vendrán el monto y la cuenta destino.
// Bancolombia: Transferiste $379,424 desde tu cuenta *0279 a la cuenta *62985980565 el 05/10/2024 a las 07:30. ¿Dudas? Llamanos al 018000931987. Estamos cerca.
