import { Router } from 'express';
import { writeEntry } from '../lib/markdown.js';

const VALIDATION_MESSAGES = new Set(['day must be 1-7', 'content is required']);

export function createEntriesRouter(dataDir) {
  const router = Router();

  router.post('/entries', async (req, res, next) => {
    try {
      const entry = await writeEntry(dataDir, req.body ?? {});
      res.status(201).json(entry);
    } catch (err) {
      if (VALIDATION_MESSAGES.has(err.message)) {
        res.status(400).json({ error: err.message });
      } else {
        next(err);
      }
    }
  });

  return router;
}
