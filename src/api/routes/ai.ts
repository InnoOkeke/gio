import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { isBlocked } from '../../ai/blocklist.js';
import { explainLogo, generateLogo } from '../../ai/logo-assistant.js';
import { moderate } from '../../ai/moderation.js';
import { assertHintable, hintLogo } from '../../ai/tutor.js';
import { giveBackDailySlot, takeDailySlot } from '../../db/ai-usage.js';
import { db } from '../../db/client.js';
import { dailyCap, rateLimit } from '../middleware/rate-limit.js';
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

// Level 3 (the fix) can be requested directly, without levels 1 and 2. This is deliberate: the site has no accounts or per-child state,
// so the server cannot know which hints a child has seen. A proof token would need a secret shared by every server instance and would
// stop nothing, because /api/ai/logo already writes a whole program for any request. The ladder is a teaching nudge in the UI, and cost
// is capped by the rate limiter and the daily cap.
const hintSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  code: z.string().max(MAX_CODE_LENGTH),
  style,
  questId: z.string().max(40).optional(),
});

// One shared budget per child for every AI request, so the endpoints can't be used to run up costs.
const limiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 30,
  message: 'The turtle needs a little rest. Try again in a few minutes.',
});

/** AI_DAILY_LIMIT: AI requests per UTC day for the whole site. Must be a positive whole number. */
function dailyLimit(): number {
  const raw = process.env['AI_DAILY_LIMIT']?.trim();
  if (!raw) throw new Error('AI_DAILY_LIMIT is not set. Add it to .env (see .env.example) or the process environment.');
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new Error(`AI_DAILY_LIMIT must be a positive whole number, got "${raw}".`);
  return n;
}

const siteCap = dailyCap({
  max: dailyLimit(),
  take: (day, max) => takeDailySlot(db, day, max),
  message: "The turtle has done lots of drawing today! You can still write code yourself, and I'll be back tomorrow.",
});

const REDIRECT_MESSAGE = "Let's draw something else! I can help with shapes, animals, houses, games and more. What would you like to make?";
const RETRY_MESSAGE = "I can't check that idea right now. Please try again in a moment.";

/** What a child typed or wrote in this request: the prompt and any code (code can hold comments and words). */
function childText(body: { prompt?: string; code?: string }): string {
  return [body.prompt, body.code].filter(Boolean).join('\n');
}

/**
 * What the local blocklist reads. The prompt is read in full. Code is read only in its comments (text after a semicolon),
 * because names a child picks for variables and procedures, such as `ass` or `meth`, are not messages to anyone.
 * The moderation check below still reads all of the code.
 */
function blocklistText(body: { prompt?: string; code?: string }): string {
  const comments = (body.code ?? '')
    .split(/\r?\n/)
    .map((line) => (line.includes(';') ? line.slice(line.indexOf(';') + 1) : ''))
    .filter(Boolean);
  return [body.prompt, ...comments].filter(Boolean).join('\n');
}

/** Step 1, free: the local blocklist turns away obvious bad words before anything else happens. */
function blocklist(req: Request, res: Response, next: NextFunction): void {
  if (isBlocked(blocklistText(req.body as { prompt?: string; code?: string }))) {
    res.status(422).json({ success: false, error: REDIRECT_MESSAGE, code: 'redirect' });
    return;
  }
  next();
}

/**
 * Step 2: a Qwen moderation check before any code is generated or explained.
 * Fail-closed: if the check cannot give a clear answer, nothing is generated (see ai/moderation.ts).
 */
async function moderation(req: Request, res: Response, next: NextFunction): Promise<void> {
  // The daily cap was counted just before this check. A refused or failed check gives that request back.
  const refund = () => giveBackDailySlot(db, new Date().toISOString().slice(0, 10));
  try {
    const verdict = await moderate(childText(req.body as { prompt?: string; code?: string }));
    if (verdict === 'unsafe') {
      refund();
      res.status(422).json({ success: false, error: REDIRECT_MESSAGE, code: 'redirect' });
      return;
    }
    next();
  } catch (err) {
    refund();
    console.error('[ai/moderation] check failed, refusing the request (fail-closed):', err);
    res.status(503).json({ success: false, error: RETRY_MESSAGE });
  }
}

function fail(res: Response, label: string, err: unknown): void {
  const status = (err as { status?: number }).status === 400 ? 400 : 502;
  if (status === 502) console.error(`[ai/${label}] error:`, err);
  res.status(status).json({ success: false, error: err instanceof Error ? err.message : 'The turtle helper is not available right now' });
}

/** Part of validation: an unknown or wrong-age quest, an empty free-mode request or a solved quest is a 400 before anything is counted or sent. */
function hintCheck(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body as z.infer<typeof hintSchema>;
    assertHintable(body);
    next();
  } catch (err) {
    fail(res, 'hint', err);
  }
}

router.post('/logo', limiter, validate(logoSchema), blocklist, siteCap, moderation, async (req, res) => {
  try {
    const code = await generateLogo(req.body as z.infer<typeof logoSchema>);
    res.json({ success: true, data: { code } });
  } catch (err) {
    fail(res, 'logo', err);
  }
});

router.post('/explain', limiter, validate(explainSchema), blocklist, siteCap, moderation, async (req, res) => {
  try {
    const text = await explainLogo(req.body as z.infer<typeof explainSchema>);
    res.json({ success: true, data: { text } });
  } catch (err) {
    fail(res, 'explain', err);
  }
});

router.post('/hint', limiter, validate(hintSchema), hintCheck, blocklist, siteCap, moderation, async (req, res) => {
  try {
    const body = req.body as z.infer<typeof hintSchema>;
    const hint = await hintLogo(body);
    res.json({ success: true, data: hint });
  } catch (err) {
    fail(res, 'hint', err);
  }
});

export default router;
