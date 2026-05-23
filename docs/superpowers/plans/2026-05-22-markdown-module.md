# markdown.js Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `server/lib/markdown.js`, the only layer that reads/writes Brújula entries as `.md` files with frontmatter.

**Architecture:** Three pure async functions (`writeEntry`, `readEntry`, `listEntries`) over an explicit `dataDir` argument — no global state, so tests use a temp dir. Frontmatter is serialized with `gray-matter`. Because `gray-matter`'s YAML engine auto-parses date-like values into `Date` objects on read, `readEntry` normalizes `date`/`created`/`updated` back to strings.

**Tech Stack:** Node 22+ ESM, `gray-matter`, `node:fs/promises`, `node --test`. 2-space indentation.

**Spec:** `docs/superpowers/specs/2026-05-22-markdown-module-design.md`

---

### Task 1: Add gray-matter dependency

**Files:**
- Modify: `package.json` (dependencies)

- [ ] **Step 1: Install gray-matter**

Run: `npm install gray-matter`
Expected: `package.json` gains `gray-matter` under `dependencies`; `package-lock.json` updated.

- [ ] **Step 2: Verify it imports**

Run: `node -e "import('gray-matter').then(m => console.log(typeof m.default))"`
Expected: prints `function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add gray-matter dependency"
```

---

### Task 2: writeEntry + readEntry round-trip (the core)

**Files:**
- Create: `server/lib/markdown.js`
- Test: `tests/markdown.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/markdown.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — cannot find module `../server/lib/markdown.js`.

- [ ] **Step 3: Write minimal implementation**

Create `server/lib/markdown.js`:

```js
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

export async function writeEntry(dataDir, { day, question, content }) {
  assertDay(day);
  if (!content || !content.trim()) {
    throw new Error('content is required');
  }
  await fs.mkdir(dataDir, { recursive: true });
  const now = new Date().toISOString();
  const existing = await readEntry(dataDir, day);
  const created = existing ? existing.created : now;
  const date = existing ? existing.date : now.slice(0, 10);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add server/lib/markdown.js tests/markdown.test.js
git commit -m "feat: add writeEntry and readEntry to markdown module"
```

---

### Task 3: Editing preserves created and date

**Files:**
- Modify: `tests/markdown.test.js` (add test)

- [ ] **Step 1: Write the failing test**

Append to `tests/markdown.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test`
Expected: PASS. (The Task 2 implementation already handles this; this test locks the behavior in. If it fails, the edit logic in `writeEntry` is wrong.)

- [ ] **Step 3: Commit**

```bash
git add tests/markdown.test.js
git commit -m "test: lock edit semantics (created/date preserved)"
```

---

### Task 4: Validation errors

**Files:**
- Modify: `tests/markdown.test.js` (add tests)

- [ ] **Step 1: Write the failing tests**

Append to `tests/markdown.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `node --test`
Expected: PASS. (Validation is already in the Task 2 implementation; these tests pin it down.)

- [ ] **Step 3: Commit**

```bash
git add tests/markdown.test.js
git commit -m "test: cover day and content validation"
```

---

### Task 5: readEntry returns null for a missing day

**Files:**
- Modify: `tests/markdown.test.js` (add test)

- [ ] **Step 1: Write the test**

Append to `tests/markdown.test.js`:

```js
test('readEntry returns null when the entry does not exist', async () => {
  const dir = await tmpDir();
  assert.equal(await readEntry(dir, 5), null);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/markdown.test.js
git commit -m "test: readEntry returns null for missing entry"
```

---

### Task 6: listEntries

**Files:**
- Modify: `server/lib/markdown.js` (add `listEntries`)
- Modify: `tests/markdown.test.js` (add tests + import)

- [ ] **Step 1: Write the failing tests**

Update the import line at the top of `tests/markdown.test.js`:

```js
import { writeEntry, readEntry, listEntries } from '../server/lib/markdown.js';
```

Append the tests:

```js
test('listEntries returns [] when data dir does not exist', async () => {
  const missing = join(os.tmpdir(), 'brujula-does-not-exist-xyz');
  assert.deepEqual(await listEntries(missing), []);
});

test('listEntries returns existing entries sorted by day', async () => {
  const dir = await tmpDir();
  await writeEntry(dir, { day: 3, question: 'q3', content: 'c3' });
  await writeEntry(dir, { day: 1, question: 'q1', content: 'c1' });

  const entries = await listEntries(dir);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((e) => e.day), [1, 3]);
  assert.equal(entries[0].content, 'c1');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `listEntries` is not a function / not exported.

- [ ] **Step 3: Add listEntries to the module**

Append to `server/lib/markdown.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add server/lib/markdown.js tests/markdown.test.js
git commit -m "feat: add listEntries to markdown module"
```

---

### Task 7: Update progress in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (Progreso section)

- [ ] **Step 1: Mark 1.3 done, point to 1.4**

Change the progress lines so 1.3 reads as completed (✅) and the ⏭️ marker moves to 1.4. Match the existing style of the other completed entries.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark session 1.3 (markdown module) done"
```

---

## Notes for the implementer

- **Run all tests with** `node --test` from the repo root. The runner auto-discovers `tests/markdown.test.js` via the `*.test.js` pattern.
- **Never write to the real `data/` dir in tests** — always `fs.mkdtemp`.
- Commit messages are in English (project convention as of 2026-05-22).
- Indentation is 2 spaces.
