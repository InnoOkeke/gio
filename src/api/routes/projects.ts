import { Router } from 'express';
import { z } from 'zod';
import { createProject, getProjectBySlug, toPublic, updateProject } from '../../db/projects.js';
import { validate } from '../middleware/validate.js';

const router = Router();

export const MAX_CODE_LENGTH = 20_000;
const title = z.string().trim().min(1, 'Give your project a name').max(80, 'Project names can be up to 80 characters');
const code = z.string().max(MAX_CODE_LENGTH, `Programs can be up to ${MAX_CODE_LENGTH.toLocaleString('en-US')} characters`);
const SLUG = /^[a-z0-9]{10}$/;
const EDIT_KEY = /^[0-9a-f-]{36}$/;

const createSchema = z.object({ title, code });
const updateSchema = z.object({ title: title.optional(), code: code.optional() }).refine((b) => b.title !== undefined || b.code !== undefined, {
  message: 'Send a title or code to update',
});

// POST / — save a new project. The response includes the edit key; only the creator ever sees it.
router.post('/', validate(createSchema), (req, res) => {
  const project = createProject(req.body as z.infer<typeof createSchema>);
  res.status(201).json({ success: true, data: { ...toPublic(project), editKey: project.id } });
});

// GET /:slug — open a shared project.
router.get('/:slug', (req, res) => {
  const slug = req.params['slug']!;
  const project = SLUG.test(slug) ? getProjectBySlug(slug) : undefined;
  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }
  res.json({ success: true, data: toPublic(project) });
});

// PUT /:slug — save changes. Requires the edit key in the X-Edit-Key header.
router.put('/:slug', validate(updateSchema), (req, res) => {
  const slug = req.params['slug']!;
  const editKey = req.header('x-edit-key') ?? '';
  if (!SLUG.test(slug) || !EDIT_KEY.test(editKey)) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }
  const project = updateProject(slug, editKey, req.body as z.infer<typeof updateSchema>);
  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }
  res.json({ success: true, data: toPublic(project) });
});

export default router;
