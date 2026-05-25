import express from 'express';
import { createEntriesRouter } from './routes/entries.js';
import { createJourneyRouter } from './routes/journey.js';
import { createMessagesRouter } from './routes/messages.js';
import { createQuestionsRouter } from './routes/questions.js';

export function createApp({ dataDir, messagesDir, promptsDir } = {}) {
  const app = express();

  app.use(express.json());
  if (dataDir) {
    app.use('/api', createEntriesRouter(dataDir));
    app.use('/api', createJourneyRouter(dataDir));
  }
  if (messagesDir) {
    app.use('/api', createMessagesRouter(messagesDir));
  }
  if (promptsDir) {
    app.use('/api', createQuestionsRouter(promptsDir));
  }

  // express.json() emits SyntaxError on malformed input; translate it
  // into the same JSON shape the rest of the API uses.
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'invalid JSON body' });
    }
    res.status(500).json({ error: err.message ?? 'internal error' });
  });

  return app;
}
