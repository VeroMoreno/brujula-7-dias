import { Router } from 'express';
import { getQuestion } from '../lib/questions.js';
import { resolveLocale } from '../lib/i18n.js';

const VALIDATION_MESSAGES = new Set(['day must be 1-7']);

export function createQuestionsRouter(promptsDir) {
  const router = Router();

  router.get('/questions/:day', async (req, res, next) => {
    try {
      const day = Number(req.params.day);
      const locale = resolveLocale(
        req.headers['accept-language'],
        req.query.locale
      );
      const question = await getQuestion(promptsDir, day, locale);
      res.json({ day, locale, question });
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
