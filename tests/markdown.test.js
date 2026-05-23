import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { writeEntry, readEntry } from '../server/lib/markdown.js';

async function tmpDir() {
  return fs.mkdtemp(join(os.tmpdir(), 'brujula-'));
}

test('writeEntry then readEntry round-trips an entry', async () => {
  const dir = await tmpDir();
  const written = await writeEntry(dir, {
    day: 1,
    question: '¿Qué te trajo hasta aquí?',
    content: 'Hoy me siento en pausa.',
  });

  assert.equal(written.version, 1);
  assert.equal(written.day, 1);
  assert.equal(written.question, '¿Qué te trajo hasta aquí?');
  assert.equal(written.content, 'Hoy me siento en pausa.');
  assert.match(written.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(written.created, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(written.created, written.updated);

  const read = await readEntry(dir, 1);
  assert.deepEqual(read, written);
});

test('editing an entry preserves created and date, bumps updated', async () => {
  const dir = await tmpDir();
  const first = await writeEntry(dir, {
    day: 2,
    question: '¿Qué evitas mirar?',
    content: 'Primera versión.',
  });

  // Ensure the clock advances so updated differs.
  await new Promise((r) => setTimeout(r, 10));

  const edited = await writeEntry(dir, {
    day: 2,
    question: '¿Qué evitas mirar?',
    content: 'Versión corregida.',
  });

  assert.equal(edited.content, 'Versión corregida.');
  assert.equal(edited.created, first.created);
  assert.equal(edited.date, first.date);
  assert.notEqual(edited.updated, first.updated);
});

test('writeEntry rejects day outside 1-7', async () => {
  const dir = await tmpDir();
  await assert.rejects(
    () => writeEntry(dir, { day: 8, question: 'q', content: 'x' }),
    /day must be 1-7/,
  );
});

test('writeEntry rejects empty content', async () => {
  const dir = await tmpDir();
  await assert.rejects(
    () => writeEntry(dir, { day: 1, question: 'q', content: '   ' }),
    /content is required/,
  );
});

test('readEntry rejects day outside 1-7', async () => {
  const dir = await tmpDir();
  await assert.rejects(() => readEntry(dir, 0), /day must be 1-7/);
});

test('readEntry returns null when the entry does not exist', async () => {
  const dir = await tmpDir();
  assert.equal(await readEntry(dir, 5), null);
});
