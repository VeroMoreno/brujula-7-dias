import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isSupportedLocale } from './i18n.js';

export const DEFAULT_MODEL = 'llama3.2:3b';
const DEFAULT_BASE_URL = 'http://localhost:11434';
const ENTRIES_PLACEHOLDER = '{{entries}}';

const templateCache = new Map();

// Pure: assemble the final prompt from a localized template and the entries.
// The template carries all the localized instructions ("patrones, no consejos")
// and marks where the reflections go with the {{entries}} placeholder.
export function buildSummaryPrompt(template, entries) {
  const block = [...entries]
    .sort((a, b) => a.day - b.day)
    .map((entry) => `${entry.day}. ${entry.question}\n${entry.content}`)
    .join('\n\n');
  return template.includes(ENTRIES_PLACEHOLDER)
    ? template.replaceAll(ENTRIES_PLACEHOLDER, block)
    : `${template}\n\n${block}`;
}

export async function loadSummaryTemplate(promptsDir, locale) {
  if (!isSupportedLocale(locale)) {
    throw new Error(`unsupported locale: ${locale}`);
  }
  const cacheKey = `${promptsDir}|${locale}`;
  const cached = templateCache.get(cacheKey);
  if (cached) return cached;
  const raw = await readFile(join(promptsDir, `summary.${locale}.md`), 'utf8');
  templateCache.set(cacheKey, raw);
  return raw;
}

// Thin, injectable HTTP call so callers (and tests) don't depend on a live Ollama.
async function callOllama(prompt, { model, baseUrl, fetchFn }) {
  const res = await fetchFn(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  if (!res.ok) {
    throw new Error(`ollama request failed (status ${res.status})`);
  }
  const payload = await res.json();
  return (payload.response ?? '').trim();
}

export async function generateSummary(
  entries,
  {
    promptsDir,
    locale,
    model = DEFAULT_MODEL,
    baseUrl = DEFAULT_BASE_URL,
    fetchFn = fetch,
  }
) {
  const template = await loadSummaryTemplate(promptsDir, locale);
  const prompt = buildSummaryPrompt(template, entries);
  return callOllama(prompt, { model, baseUrl, fetchFn });
}

// Test-only: reset the in-memory cache so suites don't leak state.
export function clearSummaryTemplateCache() {
  templateCache.clear();
}
