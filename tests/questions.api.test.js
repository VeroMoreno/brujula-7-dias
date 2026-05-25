import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { clearQuestionsCache } from '../server/lib/questions.js';

const SAMPLE_ES = `## 1
Q1 ES.

## 2
Q2 ES.

## 3
Q3.

## 4
Q4.

## 5
Q5.

## 6
Q6.

## 7
Q7.
`;

const SAMPLE_EN = `## 1
Q1 EN.

## 2
Q2.

## 3
Q3.

## 4
Q4.

## 5
Q5.

## 6
Q6.

## 7
Q7.
`;

describe('GET /api/questions/:day', () => {
  let server;
  let baseUrl;
  let promptsDir;

  before(async () => {
    promptsDir = await mkdtemp(join(tmpdir(), 'brujula-q-api-'));
    await writeFile(join(promptsDir, 'questions.es.md'), SAMPLE_ES);
    await writeFile(join(promptsDir, 'questions.en.md'), SAMPLE_EN);

    const app = createApp({ promptsDir });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(promptsDir, { recursive: true, force: true });
  });

  beforeEach(() => clearQuestionsCache());

  it('returns the ES question for a given day by default', async () => {
    const res = await fetch(`${baseUrl}/api/questions/1`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      day: 1,
      locale: 'es',
      question: 'Q1 ES.',
    });
  });

  it('honors the ?locale=en query override', async () => {
    const res = await fetch(`${baseUrl}/api/questions/1?locale=en`);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.locale, 'en');
    assert.equal(body.question, 'Q1 EN.');
  });

  it('returns 400 for a day outside 1-7', async () => {
    const res = await fetch(`${baseUrl}/api/questions/8`);

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'day must be 1-7' });
  });

  it('returns 400 for a non-numeric day', async () => {
    const res = await fetch(`${baseUrl}/api/questions/abc`);

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'day must be 1-7' });
  });

  it('falls back to es when an unsupported locale is requested', async () => {
    const res = await fetch(`${baseUrl}/api/questions/2?locale=jp`);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.locale, 'es');
    assert.equal(body.question, 'Q2 ES.');
  });
});
