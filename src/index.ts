import dotenv from 'dotenv';
import express from 'express';
import {adminPaymentReceiptJobFactory} from "./jobs/admin-payment-receipt.job";
import {AuthController} from "./controllers/auth.controller";
import {asClass, createContainer, InjectionMode} from 'awilix'
import {AuthService} from "./services/auth.service";

dotenv.config();

export const dependencyContainer = createContainer({
  injectionMode: InjectionMode.PROXY,
  strict: true,
})
dependencyContainer.register({
  authService: asClass(AuthService).singleton(),
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

const job = adminPaymentReceiptJobFactory()

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
