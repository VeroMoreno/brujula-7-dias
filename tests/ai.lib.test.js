import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSummaryPrompt,
  loadSummaryTemplate,
  generateSummary,
  clearSummaryTemplateCache,
} from '../server/lib/ai.js';

const ENTRIES = [
  { day: 2, question: '¿Q2?', content: 'Respuesta dos.' },
  { day: 1, question: '¿Q1?', content: 'Respuesta uno.' },
];

describe('ai.buildSummaryPrompt', () => {
  it('includes every entry question and content', () => {
    const prompt = buildSummaryPrompt('INSTRUCCIONES\n\n{{entries}}', ENTRIES);
    assert.match(prompt, /¿Q1\?/);
    assert.match(prompt, /Respuesta uno\./);
    assert.match(prompt, /¿Q2\?/);
    assert.match(prompt, /Respuesta dos\./);
  });

  it('keeps the surrounding template and removes the {{entries}} placeholder', () => {
    const prompt = buildSummaryPrompt('HEADER\n\n{{entries}}\n\nFOOTER', ENTRIES);
    assert.match(prompt, /^HEADER/);
    assert.match(prompt, /FOOTER$/);
    assert.doesNotMatch(prompt, /\{\{entries\}\}/);
  });

  it('orders entries by day ascending regardless of input order', () => {
    const prompt = buildSummaryPrompt('{{entries}}', ENTRIES);
    assert.ok(
      prompt.indexOf('Respuesta uno.') < prompt.indexOf('Respuesta dos.'),
      'day 1 must come before day 2'
    );
  });
});

describe('ai.loadSummaryTemplate', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brujula-ai-tpl-'));
    await writeFile(join(dir, 'summary.es.md'), 'PLANTILLA ES {{entries}}');
    await writeFile(join(dir, 'summary.en.md'), 'TEMPLATE EN {{entries}}');
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  beforeEach(() => clearSummaryTemplateCache());

  it('loads the template for the given locale', async () => {
    assert.match(await loadSummaryTemplate(dir, 'es'), /PLANTILLA ES/);
    assert.match(await loadSummaryTemplate(dir, 'en'), /TEMPLATE EN/);
  });

  it('rejects an unsupported locale before touching disk', async () => {
    await assert.rejects(() => loadSummaryTemplate(dir, 'jp'), /unsupported locale/);
  });
});

describe('ai.generateSummary', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brujula-ai-gen-'));
    await writeFile(join(dir, 'summary.es.md'), 'INSTR\n\n{{entries}}');
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  beforeEach(() => clearSummaryTemplateCache());

  it('sends the assembled prompt to Ollama and returns the trimmed response', async () => {
    let captured;
    const fetchFn = async (url, options) => {
      captured = { url, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ response: '  Tu resumen.  ' }) };
    };
    const summary = await generateSummary(ENTRIES, {
      promptsDir: dir,
      locale: 'es',
      model: 'llama3.2:3b',
      fetchFn,
    });
    assert.equal(summary, 'Tu resumen.');
    assert.match(captured.url, /\/api\/generate$/);
    assert.equal(captured.body.model, 'llama3.2:3b');
    assert.equal(captured.body.stream, false);
    assert.match(captured.body.prompt, /Respuesta uno\./);
  });

  it('throws a clear error when Ollama responds with a non-ok status', async () => {
    const fetchFn = async () => ({ ok: false, status: 500 });
    await assert.rejects(
      () => generateSummary(ENTRIES, { promptsDir: dir, locale: 'es', fetchFn }),
      /ollama/i
    );
  });
});
