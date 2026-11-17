import { Router } from 'express';
import { z } from 'zod';
import { generateLogo } from '../../ai/logo-assistant.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { MAX_CODE_LENGTH } from './projects.js';

const router = Router();

const logoSchema = z.object({
  prompt: z.string().trim().min(1, 'Tell the turtle what to draw').max(500, 'That idea is a bit long. Try saying it in fewer words.'),
  code: z.string().max(MAX_CODE_LENGTH).optional(),
});

const limiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 20,
  message: 'The turtle needs a little rest. Try again in a few minutes.',
});

router.post('/logo', limiter, validate(logoSchema), async (req, res) => {
  try {
    const code = await generateLogo(req.body as z.infer<typeof logoSchema>);
    res.json({ success: true, data: { code } });
  } catch (err) {
    console.error('[ai/logo] error:', err);
    res.status(502).json({ success: false, error: err instanceof Error ? err.message : 'The turtle helper is not available right now' });
  }
});

export default router;
