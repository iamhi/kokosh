import { Router } from 'express';

import * as homeController from '../controllers/homeController.js';

// import rssRouter from './rssRoute.js';

const router = Router();

router.get('/', homeController.home);

// router.use('/rssmanagement', rssRouter);

export default router;
