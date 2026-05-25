import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getQuestion,
  loadQuestions,
  clearQuestionsCache,
} from '../server/lib/questions.js';

const SAMPLE_ES = `# Preguntas

## 1
Q1 en español.

## 2
Q2 en español.

## 3
Q3.

## 4
Q4.

## 5
Q5.

## 6
Q6.

## 7
Q7.
`;

const SAMPLE_EN = `# Questions

## 1
Q1 in English.

## 2
Q2.

## 3
Q3.

## 4
Q4.

## 5
Q5.

## 6
Q6.

## 7
Q7.
`;

describe('questions.loadQuestions', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brujula-q-lib-'));
    await writeFile(join(dir, 'questions.es.md'), SAMPLE_ES);
    await writeFile(join(dir, 'questions.en.md'), SAMPLE_EN);
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  beforeEach(() => clearQuestionsCache());

  it('parses seven questions keyed by day number', async () => {
    const es = await loadQuestions(dir, 'es');
    assert.equal(es.size, 7);
    assert.equal(es.get(1), 'Q1 en español.');
    assert.equal(es.get(7), 'Q7.');
  });

  it('loads each locale into an independent map', async () => {
    const en = await loadQuestions(dir, 'en');
    assert.equal(en.get(1), 'Q1 in English.');
  });

  it('rejects an unsupported locale before touching disk', async () => {
    await assert.rejects(() => loadQuestions(dir, 'jp'), /unsupported locale/);
  });

  it('fails loudly when the file does not have exactly seven questions', async () => {
    const dirShort = await mkdtemp(join(tmpdir(), 'brujula-q-short-'));
    await writeFile(
      join(dirShort, 'questions.es.md'),
      '## 1\nOnly one.\n'
    );
    try {
      await assert.rejects(
        () => loadQuestions(dirShort, 'es'),
        /expected 7 questions/
      );
    } finally {
      await rm(dirShort, { recursive: true, force: true });
    }
  });
});

describe('questions.getQuestion', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brujula-q-get-'));
    await writeFile(join(dir, 'questions.es.md'), SAMPLE_ES);
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  beforeEach(() => clearQuestionsCache());

  it('returns the question for a valid day', async () => {
    assert.equal(await getQuestion(dir, 3, 'es'), 'Q3.');
  });

  it('rejects a day outside 1-7 with the canonical error message', async () => {
    await assert.rejects(() => getQuestion(dir, 0, 'es'), /day must be 1-7/);
    await assert.rejects(() => getQuestion(dir, 8, 'es'), /day must be 1-7/);
    await assert.rejects(() => getQuestion(dir, 1.5, 'es'), /day must be 1-7/);
  });
});
