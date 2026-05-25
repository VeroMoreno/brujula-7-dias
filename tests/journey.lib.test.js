import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  computeCurrentDay,
  getJourneyState,
  getNow,
} from '../server/lib/journey.js';
import { writeEntry, readEntry } from '../server/lib/markdown.js';

describe('journey.computeCurrentDay', () => {
  it('returns day 1 on the same UTC day as the start', () => {
    const started = '2026-05-25T10:00:00Z';
    const now = new Date('2026-05-25T23:55:00Z');
    assert.deepEqual(computeCurrentDay(started, now), {
      day: 1,
      complete: false,
    });
  });

  it('returns day 2 after one calendar day', () => {
    const started = '2026-05-25T10:00:00Z';
    const now = new Date('2026-05-26T00:05:00Z');
    assert.deepEqual(computeCurrentDay(started, now), {
      day: 2,
      complete: false,
    });
  });

  it('returns day 7 after six days, still not complete', () => {
    const started = '2026-05-25T10:00:00Z';
    const now = new Date('2026-05-31T10:00:00Z');
    assert.deepEqual(computeCurrentDay(started, now), {
      day: 7,
      complete: false,
    });
  });

  it('flags complete on the seventh elapsed day', () => {
    const started = '2026-05-25T10:00:00Z';
    const now = new Date('2026-06-01T10:00:00Z');
    assert.deepEqual(computeCurrentDay(started, now), {
      day: 7,
      complete: true,
    });
  });

  it('clamps day at 7 even after many days', () => {
    const started = '2026-05-25T10:00:00Z';
    const now = new Date('2026-12-31T10:00:00Z');
    const result = computeCurrentDay(started, now);
    assert.equal(result.day, 7);
    assert.equal(result.complete, true);
  });

  it('never goes below day 1 even if now is before started', () => {
    const started = '2026-05-25T10:00:00Z';
    const now = new Date('2026-05-20T10:00:00Z');
    assert.deepEqual(computeCurrentDay(started, now), {
      day: 1,
      complete: false,
    });
  });
});

describe('journey.getJourneyState', () => {
  let dataDir;

  before(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'brujula-journey-'));
  });

  after(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('returns day 1 with no startedAt when data dir has no entries', async () => {
    const state = await getJourneyState(
      dataDir,
      new Date('2026-05-25T10:00:00Z')
    );
    assert.deepEqual(state, { day: 1, startedAt: null, complete: false });
  });

  it('uses created of day-1.md as the journey start', async () => {
    await writeEntry(dataDir, { day: 1, question: 'q', content: 'c' });
    const day1 = await readEntry(dataDir, 1);
    const future = new Date(new Date(day1.created).getTime() + 3 * 86_400_000);
    const state = await getJourneyState(dataDir, future);
    assert.equal(state.day, 4);
    assert.equal(state.startedAt, day1.created);
    assert.equal(state.complete, false);
  });
});

describe('journey.getNow', () => {
  it('respects BRUJULA_TODAY when set', () => {
    const prev = process.env.BRUJULA_TODAY;
    try {
      process.env.BRUJULA_TODAY = '2026-06-15';
      assert.equal(getNow().toISOString(), '2026-06-15T00:00:00.000Z');
    } finally {
      if (prev === undefined) delete process.env.BRUJULA_TODAY;
      else process.env.BRUJULA_TODAY = prev;
    }
  });

  it('falls back to the system clock when BRUJULA_TODAY is unset', () => {
    const prev = process.env.BRUJULA_TODAY;
    try {
      delete process.env.BRUJULA_TODAY;
      const before = Date.now();
      const now = getNow();
      const after = Date.now();
      assert.ok(now.getTime() >= before && now.getTime() <= after);
    } finally {
      if (prev !== undefined) process.env.BRUJULA_TODAY = prev;
    }
  });
});
