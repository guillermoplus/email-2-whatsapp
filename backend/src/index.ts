import { sendAdminPaymentReceiptJobFactory } from './jobs/send-admin-payment-receipt.job';
import { AuthController } from './controllers/auth.controller';
import { asClass, asValue, createContainer, InjectionMode } from 'awilix';
import { AuthService } from './services/auth.service';
import { TokenRepository } from './database/repositories/token.repository';
import { refreshTokenJobFactory } from './jobs/refresh-token.job';
import { OutlookService } from './services/outlook.service';
import { connect, SqliteDatabase } from './database/data-source';
import { WhatsAppService } from './services/whatsapp.service';
import environment from './config/environment';
import { MessageRepository } from './database/repositories/message.repository';
import { createExpressServer, useContainer } from 'routing-controllers';
import { AwilixAdapter } from './adapters/awilix.adapter';

export const dependencyContainer = createContainer({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

const preloadConfiguration = async () => {
  // Database connection
  const dbConnection = await connect();
  return {
    dbConnection,
  };
};

const initServer = async (preloadedDependencies: { dbConnection: SqliteDatabase }) => {
  environment();

  dependencyContainer.register({
    // Database
    dbConnection: asValue(preloadedDependencies.dbConnection),

    // Repositories
    tokenRepository: asClass(TokenRepository).singleton(),
    messageRepository: asClass(MessageRepository).singleton(),

    // Services
    authService: asClass(AuthService).singleton(),
    outlookService: asClass(OutlookService).transient(),
    whatsappService: asClass(WhatsAppService).singleton(),

    // Controllers
    authController: asClass(AuthController).singleton(),
  });

  useContainer(new AwilixAdapter(dependencyContainer));

  const app = createExpressServer({
    controllers: [AuthController],
    routePrefix: '/api',
  });

  const PORT = process.env.PORT || 3072;

  // app.get('/', (req, res) => {
  //   res.send('App is running!');
  // });

  // const authController = dependencyContainer.resolve<AuthController>('authController');
  // app.get('/api/outlook/login', authController.login.bind(authController));
  // app.get('/api/outlook/login/callback', authController.callback.bind(authController));
  // app.get('/api/whatsapp/login', authController.whatsappLogin.bind(authController));

  const jobs = new Map<string, any>();
  jobs.set('refreshTokenJob', refreshTokenJobFactory());
  jobs.set('adminPaymentReceiptJob', sendAdminPaymentReceiptJobFactory());

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

preloadConfiguration()
  .then(initServer)
  .catch((e) => {
    console.error('Error:', e);
  });
