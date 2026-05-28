import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { writeEntry } from '../server/lib/markdown.js';

describe('POST /api/entries', () => {
  let server;
  let baseUrl;
  let dataDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-api-'));
    const app = createApp({ dataDir });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  async function post(body, { raw = false } = {}) {
    return fetch(`${baseUrl}/api/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw ? body : JSON.stringify(body),
    });
  }

  it('persists the entry and returns 201 with the stored record', async () => {
    const res = await post({
      day: 1,
      question: '¿Qué transición estás atravesando?',
      content: 'Cambio de carrera tras una baja larga.',
    });

    assert.equal(res.status, 201);
    const entry = await res.json();
    assert.equal(entry.version, 1);
    assert.equal(entry.day, 1);
    assert.equal(entry.question, '¿Qué transición estás atravesando?');
    assert.equal(entry.content, 'Cambio de carrera tras una baja larga.');
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.created);
    assert.ok(entry.updated);
  });

  it('rejects a day outside 1-7 with 400 and a clear message', async () => {
    const res = await post({ day: 8, question: 'q', content: 'x' });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'day must be 1-7' });
  });

  it('rejects empty content with 400 and a clear message', async () => {
    const res = await post({ day: 2, question: 'q', content: '   ' });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'content is required' });
  });

  it('rejects a missing body with 400 (day is reported as missing)', async () => {
    const res = await fetch(`${baseUrl}/api/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'day must be 1-7' });
  });

  it('rejects malformed JSON with 400 and a JSON error payload', async () => {
    const res = await post('{not json', { raw: true });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'invalid JSON body' });
  });
});

describe('GET /api/entries', () => {
  let server;
  let baseUrl;
  let dataDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-api-get-'));
    const app = createApp({ dataDir });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  // Each test inspects the whole directory, so isolate them by wiping it.
  beforeEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('returns 200 and an empty array when there are no entries yet', async () => {
    const res = await fetch(`${baseUrl}/api/entries`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  it('returns 200 and all entries sorted by day ascending', async () => {
    await writeEntry(dataDir, { day: 3, question: 'q3', content: 'c3' });
    await writeEntry(dataDir, { day: 1, question: 'q1', content: 'c1' });
    await writeEntry(dataDir, { day: 2, question: 'q2', content: 'c2' });

    const res = await fetch(`${baseUrl}/api/entries`);

    assert.equal(res.status, 200);
    const entries = await res.json();
    assert.equal(entries.length, 3);
    assert.deepEqual(entries.map((e) => e.day), [1, 2, 3]);
    assert.deepEqual(entries.map((e) => e.content), ['c1', 'c2', 'c3']);
    assert.equal(entries[0].version, 1);
  });
});

describe('DELETE /api/entries/:day', () => {
  let server;
  let baseUrl;
  let dataDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-api-delete-'));
    const app = createApp({ dataDir });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('removes the entry and returns 204 with no body', async () => {
    await writeEntry(dataDir, { day: 2, question: 'q', content: 'c' });

    const res = await fetch(`${baseUrl}/api/entries/2`, { method: 'DELETE' });

    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');

    const list = await fetch(`${baseUrl}/api/entries`);
    assert.deepEqual(await list.json(), []);
  });

  it('returns 404 when the entry does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/entries/5`, { method: 'DELETE' });

    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'entry not found' });
  });

  it('returns 400 when the day is outside 1-7', async () => {
    const res = await fetch(`${baseUrl}/api/entries/8`, { method: 'DELETE' });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'day must be 1-7' });
  });

  it('returns 400 when the day is not a number', async () => {
    const res = await fetch(`${baseUrl}/api/entries/abc`, { method: 'DELETE' });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'day must be 1-7' });
  });
});
