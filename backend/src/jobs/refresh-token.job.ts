import {CronJob} from "cron";
import {dependencyContainer} from "../index";
import {TokenRepository} from "../database/repositories/token.repository";
import {TokenEntity} from "../database/entities/token.entity";
import {AuthService} from "../services/auth.service";
import environment from "../config/environment";

export const refreshTokenJobFactory = () => {
  const cronTime = environment().cronTime.refreshOutlookToken;
  return CronJob.from({
    cronTime: cronTime,
    onTick: async (onComplete) => {
      console.log('::: Refresh Token job is running...');
      try {
        const tokenRepository = dependencyContainer.resolve<TokenRepository>('tokenRepository');
        const currentToken = await tokenRepository.getLatestToken();
        if (!currentToken) {
          console.error('No token to refresh found.');
          return;
        }
        if (!tokenMustBeRefreshed(currentToken)) {
          return;
        }
        const authService = dependencyContainer.resolve<AuthService>('authService');
        const newToken = await authService.refreshToken(currentToken.refresh_token);
        await tokenRepository.save(newToken);
        console.log('Token refreshed successfully!');
      } catch (e: any) {
        console.error('::: Error in Refresh Token job:', e);
      } finally {
        onComplete();
      }
    },
    onComplete: () => {
      console.log('::: Refresh Token job has finished!');
    },
    start: true,
    timeZone: 'America/Bogota',
  })
}

/**
 * Check if the token must be refreshed.
 * @param {TokenEntity} token
 */
const tokenMustBeRefreshed = (token: TokenEntity) => {
  // Less than 5 minutes to expire
  const fiveMinutesInMilliseconds = 5 * 60 * 1000;
  const expiresAt = new Date(token.created_at).getTime() + token.expires_in * 1000;
  const now = new Date();
  const lessThanFiveMinutesToExpire = (expiresAt - now.getTime() < fiveMinutesInMilliseconds);
  const isAlreadyExpired = expiresAt < now.getTime();
  return lessThanFiveMinutesToExpire || isAlreadyExpired;
}
