import { Router } from 'express';
import { loadMessages, resolveLocale } from '../lib/i18n.js';

export function createMessagesRouter(messagesDir) {
  const router = Router();

  router.get('/messages', async (req, res, next) => {
    try {
      const locale = resolveLocale(
        req.headers['accept-language'],
        req.query.locale
      );
      const messages = await loadMessages(messagesDir, locale);
      res.json({ locale, messages });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
