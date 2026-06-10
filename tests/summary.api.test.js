import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { writeEntry, writeSummary } from '../server/lib/markdown.js';
import { __setNowForTests } from '../server/lib/journey.js';

const DAY = 86_400_000;

// A day-1 entry is created with the real clock; push "now" past 7 days so the
// journey reads as complete without waiting.
function completeNow() {
  return new Date(Date.now() + 8 * DAY);
}

async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe('POST /api/summary', () => {
  let server;
  let baseUrl;
  let dataDir;
  let captured;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-summary-api-'));
    const generate = async (entries, opts) => {
      captured = { entries, opts };
      return '  Tus patrones del día 7.  ';
    };
    const app = createApp({ dataDir, promptsDir: dataDir, summaryGenerate: generate });
    ({ server, baseUrl } = await listen(app));
  });

  after(async () => {
    __setNowForTests(null);
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    __setNowForTests(null);
    await rm(dataDir, { recursive: true, force: true });
    captured = undefined;
  });

  function post(body) {
    return fetch(`${baseUrl}/api/summary`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 409 when the journey is not complete', async () => {
    await writeEntry(dataDir, { day: 1, question: 'q1', content: 'c1' });

    const res = await post({ locale: 'es' });

    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { error: 'journey not complete' });
  });

  it('generates, persists and returns 201 with the stored summary when complete', async () => {
    await writeEntry(dataDir, { day: 1, question: 'q1', content: 'c1' });
    await writeEntry(dataDir, { day: 2, question: 'q2', content: 'c2' });
    __setNowForTests(completeNow());

    const res = await post({ locale: 'es' });

    assert.equal(res.status, 201);
    const summary = await res.json();
    assert.equal(summary.content, 'Tus patrones del día 7.');
    assert.equal(summary.model, 'llama3.2:3b');
    assert.equal(summary.locale, 'es');
    assert.equal(summary.version, 1);
    assert.equal(captured.entries.length, 2);
    assert.equal(captured.opts.locale, 'es');
  });

  it('returns 400 for an unsupported locale', async () => {
    const res = await post({ locale: 'jp' });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'unsupported locale' });
  });
});

describe('POST /api/summary when generation fails', () => {
  let server;
  let baseUrl;
  let dataDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-summary-fail-'));
    const generate = async () => {
      throw new Error('ollama request failed (status 500)');
    };
    const app = createApp({ dataDir, promptsDir: dataDir, summaryGenerate: generate });
    ({ server, baseUrl } = await listen(app));
  });

  after(async () => {
    __setNowForTests(null);
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  it('returns 502 when the provider throws', async () => {
    await writeEntry(dataDir, { day: 1, question: 'q1', content: 'c1' });
    __setNowForTests(completeNow());

    const res = await fetch(`${baseUrl}/api/summary`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'es' }),
    });

    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'summary generation failed' });
  });
});

describe('GET /api/summary', () => {
  let server;
  let baseUrl;
  let dataDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-summary-get-'));
    const app = createApp({ dataDir, promptsDir: dataDir, summaryGenerate: async () => '' });
    ({ server, baseUrl } = await listen(app));
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('returns 404 when no summary has been generated', async () => {
    const res = await fetch(`${baseUrl}/api/summary`);

    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'summary not found' });
  });

  it('returns 200 with the persisted summary', async () => {
    await writeSummary(dataDir, {
      content: 'Resumen guardado.',
      model: 'llama3.2:3b',
      locale: 'es',
    });

    const res = await fetch(`${baseUrl}/api/summary`);

    assert.equal(res.status, 200);
    const summary = await res.json();
    assert.equal(summary.content, 'Resumen guardado.');
    assert.equal(summary.locale, 'es');
  });
});
