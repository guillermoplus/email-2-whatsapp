import express from 'express';
import {sendAdminPaymentReceiptJobFactory} from "./jobs/send-admin-payment-receipt.job";
import {AuthController} from "./controllers/auth.controller";
import {asClass, asValue, createContainer, InjectionMode} from 'awilix'
import {AuthService} from "./services/auth.service";
import {TokenRepository} from "./database/repositories/token.repository";
import {refreshTokenJobFactory} from "./jobs/refresh-token.job";
import {OutlookService} from "./services/outlook.service";
import {connect, SqliteDatabase} from "./database/data-source";
import {WhatsAppService} from "./services/whatsapp.service";
import environment from "./config/environment";

//Define Environment


export const dependencyContainer = createContainer({
  injectionMode: InjectionMode.PROXY,
  strict: true,
})

const preloadDependencies = async () => {
  // Database connection
  const dbConnection = await connect();
  return {
    dbConnection
  }
}

const initServer = async (preloadedDependencies: {
  dbConnection: SqliteDatabase
}) => {
  environment();

  dependencyContainer.register({
    dbConnection: asValue(preloadedDependencies.dbConnection),
    tokenRepository: asClass(TokenRepository).singleton(),
    authService: asClass(AuthService).singleton(),
    outlookService: asClass(OutlookService).transient(),
    whatsappService: asClass(WhatsAppService).singleton(),
    authController: asClass(AuthController).singleton(),
  })

  const app = express();

  const PORT = process.env.PORT || 3072;

  app.get('/', (req, res) => {
    res.send('App is running!');
  });

  const authController = dependencyContainer.resolve<AuthController>('authController');
  app.get('/api/outlook/login', authController.login.bind(authController))
  app.get('/api/outlook/login/callback', authController.callback.bind(authController))

  const jobs = new Map<string, any>();
  jobs.set('adminPaymentReceiptJob', sendAdminPaymentReceiptJobFactory());
  jobs.set('refreshTokenJob', refreshTokenJobFactory());

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

preloadDependencies()
  .then(initServer)
  .catch(e => {
    console.error('Error:', e);
  });
