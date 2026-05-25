import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SUPPORTED_LOCALES = ['es', 'en'];
export const DEFAULT_LOCALE = 'es';

const messagesCache = new Map();

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export function resolveLocale(acceptLanguageHeader, override) {
  if (override && isSupportedLocale(override)) return override;
  if (acceptLanguageHeader) {
    const firstTag = acceptLanguageHeader.split(',')[0]?.trim().toLowerCase();
    const language = firstTag?.split(/[-;]/)[0];
    if (language && isSupportedLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}

export async function loadMessages(messagesDir, locale) {
  if (!isSupportedLocale(locale)) {
    throw new Error(`unsupported locale: ${locale}`);
  }
  const cacheKey = `${messagesDir}|${locale}`;
  const cached = messagesCache.get(cacheKey);
  if (cached) return cached;
  const raw = await readFile(join(messagesDir, `${locale}.json`), 'utf8');
  const messages = JSON.parse(raw);
  messagesCache.set(cacheKey, messages);
  return messages;
}

// Test-only: reset the in-memory cache so suites don't leak state.
export function clearMessagesCache() {
  messagesCache.clear();
}
