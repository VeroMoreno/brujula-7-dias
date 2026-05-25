import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { createApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const MESSAGES_DIR = join(ROOT, 'messages');
const PROMPTS_DIR = join(__dirname, 'prompts');

const app = createApp({
  dataDir: DATA_DIR,
  messagesDir: MESSAGES_DIR,
  promptsDir: PROMPTS_DIR,
});
app.use(express.static(join(ROOT, 'web')));

app.listen(PORT, () => {
  console.log(`Brújula escuchando en http://localhost:${PORT}`);
});
