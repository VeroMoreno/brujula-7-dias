import express from 'express';
import { createEntriesRouter } from './routes/entries.js';
import { createMessagesRouter } from './routes/messages.js';

export function createApp({ dataDir, messagesDir } = {}) {
  const app = express();

  app.use(express.json());
  app.use('/api', createEntriesRouter(dataDir));
  if (messagesDir) {
    app.use('/api', createMessagesRouter(messagesDir));
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
