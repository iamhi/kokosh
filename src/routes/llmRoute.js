import { Router } from 'express';
import * as llmController from '../controllers/llmController.js';
import { validateLlm } from '../middlewares/validators.js';

const router = Router();

router.post('/', validateLlm, llmController.llm);

export default router;
