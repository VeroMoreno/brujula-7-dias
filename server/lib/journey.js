import { readEntry } from './markdown.js';

const MS_PER_DAY = 86_400_000;
const TOTAL_DAYS = 7;

let nowOverride = null;

// Test-only: inject a fixed "now" so suites don't depend on real clock.
export function __setNowForTests(date) {
  nowOverride = date;
}

export function getNow() {
  if (nowOverride) return nowOverride;
  const envDate = process.env.BRUJULA_TODAY;
  if (envDate) return new Date(`${envDate}T00:00:00Z`);
  return new Date();
}

export function computeCurrentDay(startedAtIso, now) {
  const startDay = Math.floor(new Date(startedAtIso).getTime() / MS_PER_DAY);
  const nowDay = Math.floor(now.getTime() / MS_PER_DAY);
  const elapsed = Math.max(0, nowDay - startDay);
  return {
    day: Math.min(elapsed + 1, TOTAL_DAYS),
    complete: elapsed >= TOTAL_DAYS,
  };
}

export async function getJourneyState(dataDir, now = getNow()) {
  const day1 = await readEntry(dataDir, 1);
  if (!day1) {
    return { day: 1, startedAt: null, complete: false };
  }
  const { day, complete } = computeCurrentDay(day1.created, now);
  return { day, startedAt: day1.created, complete };
}
