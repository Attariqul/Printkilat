import express from 'express';
import cookieParser from 'cookie-parser';
import serverless from 'serverless-http';
import { cleanupExpiredFiles, seedInitialDataIfEmpty } from '../../server/db.ts';
import { createApiRouter } from '../../server/routes.ts';

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ limit: '6mb', extended: true }));

let initPromise: Promise<void> | null = null;

async function ensureSeeded(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await seedInitialDataIfEmpty();
      cleanupExpiredFiles();
    })();
  }
  await initPromise;
}

app.use(async (_req, _res, next) => {
  try {
    await ensureSeeded();
    next();
  } catch (err) {
    initPromise = null;
    next(err);
  }
});

const apiRouter = createApiRouter();
app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);

export const handler = serverless(app, {
  binary: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
    'image/*',
    'multipart/form-data',
  ],
});
