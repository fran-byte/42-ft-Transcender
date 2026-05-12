import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import promClient from 'prom-client';
import env from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorMiddleware.js';

promClient.collectDefaultMetrics();

const app = express();

app.use(cors({
  origin: env.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Backend running' });
});

app.use('/api', routes);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use(errorHandler);

export default app;
