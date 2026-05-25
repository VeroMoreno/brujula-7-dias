import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { writeEntry, readEntry } from '../server/lib/markdown.js';
import { __setNowForTests } from '../server/lib/journey.js';

describe('GET /api/journey', () => {
  let server;
  let baseUrl;
  let dataDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-journey-api-'));
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
    __setNowForTests(null);
  });

  beforeEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
    __setNowForTests(null);
  });

  it('returns day 1 and a null startedAt when no entries exist yet', async () => {
    const res = await fetch(`${baseUrl}/api/journey`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      day: 1,
      startedAt: null,
      complete: false,
    });
  });

  it('returns the calendar day computed from day-1 created plus the simulated now', async () => {
    await writeEntry(dataDir, { day: 1, question: 'q', content: 'c' });
    const day1 = await readEntry(dataDir, 1);
    const future = new Date(new Date(day1.created).getTime() + 3 * 86_400_000);
    __setNowForTests(future);

    const res = await fetch(`${baseUrl}/api/journey`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.day, 4);
    assert.equal(body.startedAt, day1.created);
    assert.equal(body.complete, false);
  });

  it('flags complete after seven elapsed days', async () => {
    await writeEntry(dataDir, { day: 1, question: 'q', content: 'c' });
    const day1 = await readEntry(dataDir, 1);
    const future = new Date(new Date(day1.created).getTime() + 7 * 86_400_000);
    __setNowForTests(future);

    const res = await fetch(`${baseUrl}/api/journey`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.day, 7);
    assert.equal(body.complete, true);
  });
});
