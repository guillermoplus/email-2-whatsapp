import dotenv from 'dotenv';
import express from 'express';
import {adminPaymentReceiptJobFactory} from "./jobs/admin-payment-receipt.job";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3072;

app.get('/', (req, res) => {
  res.send('App is running!');
});

const job = adminPaymentReceiptJobFactory()

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
