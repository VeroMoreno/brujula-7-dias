import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { createApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_DIR = join(__dirname, '..', 'data');

const app = createApp({ dataDir: DATA_DIR });
app.use(express.static(join(__dirname, '..', 'web')));

app.listen(PORT, () => {
  console.log(`Brújula escuchando en http://localhost:${PORT}`);
});
