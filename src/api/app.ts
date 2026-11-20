import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import healthRouter from './routes/health.js';
import projectsRouter from './routes/projects.js';
import aiRouter from './routes/ai.js';
import { errorHandler } from './middleware/error-handler.js';
import { pyHeaders } from './middleware/py.js';

import { setStaticHeaders, spaFallback } from './middleware/static.js';
export interface AppOptions {
  /** Folder holding the built UI. Defaults to dist/ui under the current directory. */
  uiDistDir?: string;
}
export function createApp(options: AppOptions = {}): Express {
  const uiDistDir = options.uiDistDir ?? path.join(process.cwd(), 'dist', 'ui');
  const app = express();

  // Behind a load balancer or reverse proxy, set TRUST_PROXY (e.g. "1") so rate limits see real client IPs.
  const trustProxy = process.env['TRUST_PROXY'];
  if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
  app.use(helmet());
  app.use('/py', pyHeaders);
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Serve the built UI in production. In development Vite serves it on :5173 and proxies /api here.
  if (fs.existsSync(uiDistDir)) {
    app.use(express.static(uiDistDir, { setHeaders: setStaticHeaders }));
    app.use(spaFallback(uiDistDir));
  }

  app.use(errorHandler);
  return app;
}
