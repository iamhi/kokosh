import Joi from 'joi';

const llmSchema = Joi.object({
  system: Joi.string().optional(),
  user: Joi.string().optional(),
  images: Joi.array().min(1).optional(),
  tools: Joi.array().items(Joi.string().valid(
    'read_file', 
    'glob_files', 
    'grep_files', 
    'fetch_url', 
    'list_directory', 
    'write_file', 
    'web_search', 
    'rss_fetch', 
    'parse_pdf', 
    'research_scratchpad', 
    'research_rag'
  )).optional(),
  maxIterations: Joi.number().integer().positive().optional(),
  modelConfig: Joi.object().optional(),
}).or('system', 'user', 'images');

export const validateLlm = (req, res, next) => {
  const { error } = llmSchema.validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }
  next();
};
