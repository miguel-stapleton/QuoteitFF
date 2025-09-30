import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './db';
import { quotesRouter } from './routes/quotes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Serve built frontend files
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/quotes', quotesRouter);

// SPA fallback - serve index.html for any non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
})();
