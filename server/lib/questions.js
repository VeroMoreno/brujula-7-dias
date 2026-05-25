import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isSupportedLocale } from './i18n.js';

const MIN_DAY = 1;
const MAX_DAY = 7;
const EXPECTED_QUESTIONS = 7;

const questionsCache = new Map();

function assertDay(day) {
  if (!Number.isInteger(day) || day < MIN_DAY || day > MAX_DAY) {
    throw new Error('day must be 1-7');
  }
}

// Match "## <number>" headings and capture the body until the next "## " or EOF.
function parseQuestions(raw) {
  const pattern = /^## (\d+)\s*\r?\n([\s\S]+?)(?=\r?\n## |\s*$)/gm;
  const questions = new Map();
  for (const match of raw.matchAll(pattern)) {
    const day = Number(match[1]);
    if (day >= MIN_DAY && day <= MAX_DAY) {
      questions.set(day, match[2].trim());
    }
  }
  return questions;
}

export async function loadQuestions(promptsDir, locale) {
  if (!isSupportedLocale(locale)) {
    throw new Error(`unsupported locale: ${locale}`);
  }
  const cacheKey = `${promptsDir}|${locale}`;
  const cached = questionsCache.get(cacheKey);
  if (cached) return cached;
  const raw = await readFile(join(promptsDir, `questions.${locale}.md`), 'utf8');
  const questions = parseQuestions(raw);
  if (questions.size !== EXPECTED_QUESTIONS) {
    throw new Error(
      `expected ${EXPECTED_QUESTIONS} questions in questions.${locale}.md, found ${questions.size}`
    );
  }
  questionsCache.set(cacheKey, questions);
  return questions;
}

export async function getQuestion(promptsDir, day, locale) {
  assertDay(day);
  const questions = await loadQuestions(promptsDir, locale);
  return questions.get(day);
}

// Test-only: reset the in-memory cache so suites don't leak state.
export function clearQuestionsCache() {
  questionsCache.clear();
}
