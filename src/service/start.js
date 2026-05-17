import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import routes from '../routes/index.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import { setupAllRepositories } from '../db/repositories.js';
import { migrate as migrateDatabase } from '../db/migration.js'

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../../public');

export const startServer = async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const isProduction = process.env.NODE_ENV === 'production';

  // Forcefully clear Safari's cache and HSTS records when running locally
  app.use((req, res, next) => {
    if (!isProduction || req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Strict-Transport-Security', 'max-age=0');
      res.setHeader('Clear-Site-Data', '"cache"');
    }
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc:       ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc:        ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc:         ["'self'", 'data:'],
        connectSrc:     ["'self'"],
        objectSrc:      ["'none'"],
        frameAncestors: ["'self'"],
        baseUri:        ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
    hsts: false,
    crossOriginEmbedderPolicy: isProduction,
  }));
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.static(publicDir));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(compression());
  app.use(hpp());
  app.use(
    rateLimit({
      windowMs: 5 * 60 * 1000,
      max: 100,
    })
  );

  await migrateDatabase();

  setupAllRepositories();

  app.use('/api', routes);

  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};
