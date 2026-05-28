import fs from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

const SCHEMA_VERSION = 1;
const MIN_DAY = 1;
const MAX_DAY = 7;

function entryPath(dataDir, day) {
  return join(dataDir, `day-${day}.md`);
}

function assertDay(day) {
  if (!Number.isInteger(day) || day < MIN_DAY || day > MAX_DAY) {
    throw new Error('day must be 1-7');
  }
}

// js-yaml parses date-like values into Date objects; coerce back to strings.
function toDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toTimestamp(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export async function readEntry(dataDir, day) {
  assertDay(day);
  let raw;
  try {
    raw = await fs.readFile(entryPath(dataDir, day), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  const { data, content } = matter(raw);
  return {
    version: data.version,
    day: data.day,
    date: toDate(data.date),
    created: toTimestamp(data.created),
    updated: toTimestamp(data.updated),
    question: data.question,
    content: content.trim(),
  };
}

export async function listEntries(dataDir) {
  let files;
  try {
    files = await fs.readdir(dataDir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const days = files
    .map((file) => /^day-(\d+)\.md$/.exec(file))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .filter((day) => day >= MIN_DAY && day <= MAX_DAY)
    .sort((a, b) => a - b);

  const entries = [];
  for (const day of days) {
    entries.push(await readEntry(dataDir, day));
  }
  return entries;
}

export async function deleteEntry(dataDir, day) {
  assertDay(day);
  try {
    await fs.unlink(entryPath(dataDir, day));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('entry not found');
    }
    throw err;
  }
}

export async function writeEntry(dataDir, { day, question, content }) {
  assertDay(day);
  if (!content || !content.trim()) {
    throw new Error('content is required');
  }
  await fs.mkdir(dataDir, { recursive: true });
  const now = new Date().toISOString();
  const existing = await readEntry(dataDir, day);
  const created = existing ? existing.created : now;
  const date = existing ? existing.date : new Date().toLocaleDateString('en-CA');
  const frontmatter = {
    version: SCHEMA_VERSION,
    day,
    date,
    created,
    updated: now,
    question,
  };
  const file = matter.stringify(`${content.trim()}\n`, frontmatter);
  await fs.writeFile(entryPath(dataDir, day), file, 'utf8');
  return readEntry(dataDir, day);
}
