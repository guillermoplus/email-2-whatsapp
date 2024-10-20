import dotenv from 'dotenv';
import express from 'express';
import {CronJob} from "cron";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3072;

app.get('/', (req, res) => {
  res.send('App is running!');
});

const job = CronJob.from({
  cronTime: '*/5 * * * * *',
  onTick: () => {
    console.log('Cron job is running...');
  },
  onComplete: () => {
    console.log('Cron job has finished!');
  },
  start: true,
  timeZone: 'America/Bogota',
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
