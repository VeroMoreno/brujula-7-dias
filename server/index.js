import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();

// Sirve la app estática desde /web
app.use(express.static(join(__dirname, '..', 'web')));

app.listen(PORT, () => {
  console.log(`Brújula escuchando en http://localhost:${PORT}`);
});
