import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resolveLocale,
  loadMessages,
  clearMessagesCache,
} from '../server/lib/i18n.js';

describe('i18n.resolveLocale', () => {
  it('returns an explicit supported override above all else', () => {
    assert.equal(resolveLocale('es-ES,es;q=0.9', 'en'), 'en');
  });

  it('ignores an unsupported override and falls back to the header', () => {
    assert.equal(resolveLocale('en-US,en;q=0.9', 'jp'), 'en');
  });

  it('parses the first language tag from Accept-Language', () => {
    assert.equal(resolveLocale('en-US,en;q=0.9,es;q=0.8'), 'en');
  });

  it('drops the region subtag and matches by language', () => {
    assert.equal(resolveLocale('en-GB'), 'en');
  });

  it('returns the default when no header and no override', () => {
    assert.equal(resolveLocale(), DEFAULT_LOCALE);
  });

  it('returns the default when the header has no supported language', () => {
    assert.equal(resolveLocale(''), DEFAULT_LOCALE);
    assert.equal(resolveLocale('jp,fr'), DEFAULT_LOCALE);
  });
});

describe('i18n.loadMessages', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brujula-i18n-'));
    await writeFile(join(dir, 'es.json'), JSON.stringify({ hello: 'hola' }));
    await writeFile(join(dir, 'en.json'), JSON.stringify({ hello: 'hello' }));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  beforeEach(() => clearMessagesCache());

  it('loads the JSON file matching the locale', async () => {
    assert.deepEqual(await loadMessages(dir, 'es'), { hello: 'hola' });
    assert.deepEqual(await loadMessages(dir, 'en'), { hello: 'hello' });
  });

  it('rejects an unsupported locale before touching disk', async () => {
    await assert.rejects(() => loadMessages(dir, 'jp'), /unsupported locale/);
  });

  it('exposes the canonical list of supported locales', () => {
    assert.deepEqual(SUPPORTED_LOCALES, ['es', 'en']);
    assert.ok(isSupportedLocale('es'));
    assert.ok(!isSupportedLocale('jp'));
  });
});
