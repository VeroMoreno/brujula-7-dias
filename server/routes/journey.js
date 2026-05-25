import { Router } from 'express';
import { getJourneyState } from '../lib/journey.js';

export function createJourneyRouter(dataDir) {
  const router = Router();

  router.get('/journey', async (req, res, next) => {
    try {
      const state = await getJourneyState(dataDir);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
