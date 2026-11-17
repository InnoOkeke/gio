// Must stay the first import: loads .env into process.env before other modules read it.
// A missing .env is not an error (production injects real environment variables).
import 'dotenv/config';
import { createApp } from './app.js';

const PORT = Number(process.env['PORT'] ?? 3001);

createApp().listen(PORT, () => {
  console.log(`[GIO] Listening on http://localhost:${PORT}`);
});
