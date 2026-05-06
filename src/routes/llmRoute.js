import { Router } from 'express';
import * as llmController from '../controllers/llmController.js';

const router = Router();

router.post('/', llmController.llm);

export default router;
