import { Router } from 'express';
import { listEntries, readSummary, writeSummary } from '../lib/markdown.js';
import { getJourneyState } from '../lib/journey.js';
import { generateSummary, DEFAULT_MODEL } from '../lib/ai.js';
import { isSupportedLocale } from '../lib/i18n.js';

export function createSummaryRouter(dataDir, promptsDir, { generate = generateSummary } = {}) {
  const router = Router();

  router.get('/summary', async (req, res, next) => {
    try {
      const summary = await readSummary(dataDir);
      if (!summary) {
        return res.status(404).json({ error: 'summary not found' });
      }
      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  router.post('/summary', async (req, res, next) => {
    try {
      const locale = req.body?.locale ?? 'es';
      if (!isSupportedLocale(locale)) {
        return res.status(400).json({ error: 'unsupported locale' });
      }

      const journey = await getJourneyState(dataDir);
      if (!journey.complete) {
        return res.status(409).json({ error: 'journey not complete' });
      }

      const entries = await listEntries(dataDir);
      const model = DEFAULT_MODEL;

      let content;
      try {
        content = await generate(entries, { promptsDir, locale, model });
      } catch {
        return res.status(502).json({ error: 'summary generation failed' });
      }

      const summary = await writeSummary(dataDir, { content, model, locale });
      res.status(201).json(summary);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
