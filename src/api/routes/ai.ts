import { Router, type Response } from 'express';
import { z } from 'zod';
import { explainLogo, generateLogo } from '../../ai/logo-assistant.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { MAX_CODE_LENGTH } from './projects.js';

const router = Router();

const style = z.enum(['code', 'blocks']).default('code');

const logoSchema = z.object({
  prompt: z.string().trim().min(1, 'Tell the turtle what to draw').max(500, 'That idea is a bit long. Try saying it in fewer words.'),
  code: z.string().max(MAX_CODE_LENGTH).optional(),
  style,
});

const explainSchema = z.object({
  code: z.string().trim().min(1, 'Write some code first, then I can explain it').max(MAX_CODE_LENGTH),
  style,
});

// One shared budget per child for every AI request, so the endpoints can't be used to run up costs.
const limiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 30,
  message: 'The turtle needs a little rest. Try again in a few minutes.',
});

function fail(res: Response, label: string, err: unknown): void {
  const status = (err as { status?: number }).status === 400 ? 400 : 502;
  if (status === 502) console.error(`[ai/${label}] error:`, err);
  res.status(status).json({ success: false, error: err instanceof Error ? err.message : 'The turtle helper is not available right now' });
}

router.post('/logo', limiter, validate(logoSchema), async (req, res) => {
  try {
    const code = await generateLogo(req.body as z.infer<typeof logoSchema>);
    res.json({ success: true, data: { code } });
  } catch (err) {
    fail(res, 'logo', err);
  }
});

router.post('/explain', limiter, validate(explainSchema), async (req, res) => {
  try {
    const text = await explainLogo(req.body as z.infer<typeof explainSchema>);
    res.json({ success: true, data: { text } });
  } catch (err) {
    fail(res, 'explain', err);
  }
});

export default router;
