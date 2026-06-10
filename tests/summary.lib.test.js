import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSummary, readSummary } from '../server/lib/markdown.js';

describe('markdown summary helpers', () => {
  let dir;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brujula-summary-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null when no summary has been written', async () => {
    assert.equal(await readSummary(dir), null);
  });

  it('persists content and metadata and round-trips through readSummary', async () => {
    await writeSummary(dir, {
      content: 'Tus patrones del día 7.',
      model: 'llama3.2:3b',
      locale: 'es',
    });
    const summary = await readSummary(dir);
    assert.equal(summary.content, 'Tus patrones del día 7.');
    assert.equal(summary.model, 'llama3.2:3b');
    assert.equal(summary.locale, 'es');
    assert.equal(summary.version, 1);
    assert.ok(summary.created);
    assert.ok(summary.updated);
  });

  it('overwrites on regenerate, preserving created', async () => {
    const first = await writeSummary(dir, {
      content: 'Primer resumen.',
      model: 'llama3.2:3b',
      locale: 'es',
    });
    const second = await writeSummary(dir, {
      content: 'Resumen regenerado.',
      model: 'llama3.2:3b',
      locale: 'en',
    });
    assert.equal(second.created, first.created);
    assert.equal(second.content, 'Resumen regenerado.');
    assert.equal(second.locale, 'en');
  });

  it('rejects empty content', async () => {
    await assert.rejects(
      () => writeSummary(dir, { content: '   ', model: 'llama3.2:3b', locale: 'es' }),
      /content is required/
    );
  });
});
