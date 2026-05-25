import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { clearMessagesCache } from '../server/lib/i18n.js';

describe('GET /api/messages', () => {
  let server;
  let baseUrl;
  let dataDir;
  let messagesDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-msg-data-'));
    messagesDir = await mkdtemp(join(tmpdir(), 'brujula-msg-i18n-'));
    await writeFile(
      join(messagesDir, 'es.json'),
      JSON.stringify({ greeting: 'hola' })
    );
    await writeFile(
      join(messagesDir, 'en.json'),
      JSON.stringify({ greeting: 'hello' })
    );

    const app = createApp({ dataDir, messagesDir });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
    await rm(messagesDir, { recursive: true, force: true });
  });

  beforeEach(() => clearMessagesCache());

  it('falls back to es when neither header nor query specify a locale', async () => {
    const res = await fetch(`${baseUrl}/api/messages`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      locale: 'es',
      messages: { greeting: 'hola' },
    });
  });

  it('respects an explicit ?locale=en query override', async () => {
    const res = await fetch(`${baseUrl}/api/messages?locale=en`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      locale: 'en',
      messages: { greeting: 'hello' },
    });
  });

  it('resolves from Accept-Language when no override is given', async () => {
    const res = await fetch(`${baseUrl}/api/messages`, {
      headers: { 'accept-language': 'en-US,en;q=0.9' },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.locale, 'en');
  });

  it('ignores an unsupported override and degrades to the default', async () => {
    const res = await fetch(`${baseUrl}/api/messages?locale=jp`);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.locale, 'es');
  });
});
