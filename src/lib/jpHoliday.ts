import { addDays, formatDateOnly } from "@/lib/gantt";

/** 日〜土. Index matches Date#getDay(). */
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 振替休日 began on this date (1973 amendment). */
const SUBSTITUTE_FROM = "1973-04-12";
/** From 2007 the substitute moves past a run of 国民の祝日. */
const SUBSTITUTE_SKIP_FROM = "2007-01-01";
/** 国民の休日 began with the 1985 amendment. */
const CITIZENS_FROM = "1985-12-27";
/** 国民の祝日に関する法律 took effect on this date. */
const ACT_FROM = "1948-07-20";

/**
 * One-off holidays established by special statute. They count as 国民の祝日
 * for 振替休日 and 国民の休日.
 */
const EXTRA_NATIONAL: Record<number, readonly string[]> = {
  1959: ["1959-04-10"],
  1989: ["1989-02-24"],
  1990: ["1990-11-12"],
  1993: ["1993-06-09"],
  2019: ["2019-05-01", "2019-10-22"],
};

const yearCache = new Map<number, Set<string>>();

export function weekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

/** 国民の祝日, 振替休日, or 国民の休日 on this local calendar date. */
export function isJapaneseHoliday(date: Date): boolean {
  return holidaysInYear(date.getFullYear()).has(formatDateOnly(date));
}

function holidaysInYear(year: number): Set<string> {
  const cached = yearCache.get(year);
  if (cached) return cached;
  const set = computeHolidays(year);
  yearCache.set(year, set);
  return set;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** nth Monday=1 … Sunday=0 in a 1-based month. */
function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  n: number,
): string {
  const first = new Date(year, month - 1, 1);
  const delta = (weekday - first.getDay() + 7) % 7;
  return ymd(year, month, 1 + delta + (n - 1) * 7);
}

/**
 * Equinox day-of-month. Bands match the formulas checked against the
 * published calendar through 2150; later years keep the same statute and
 * shift for Gregorian century leap days the 2100 band does not include.
 */
function equinoxDay(year: number, kind: "spring" | "autumn"): number {
  const y = year - 1980;
  let base: number;
  if (kind === "spring") {
    if (year <= 1899) base = 19.8277;
    else if (year <= 1979) base = 20.8357;
    else if (year <= 2099) base = 20.8431;
    else base = 21.851;
  } else if (year <= 1899) base = 22.2588;
  else if (year <= 1979) base = 23.2588;
  else if (year <= 2099) base = 23.2488;
  else base = 24.2488;

  let day = Math.floor(base + 0.242194 * y - Math.floor(y / 4));
  if (year >= 2200) {
    for (let century = 2200; century <= year; century += 100) {
      if (century % 400 !== 0) day += 1;
    }
  }
  return day;
}

/** Named 国民の祝日 in `year` (no 振替休日 / 国民の休日). */
function nationalHolidays(year: number): Set<string> {
  const set = new Set<string>();
  if (year < 1948) return set;

  const add = (month: number, day: number) => {
    const key = ymd(year, month, day);
    if (key >= ACT_FROM) set.add(key);
  };

  add(1, 1);
  if (year >= 2000) set.add(nthWeekday(year, 1, 1, 2));
  else add(1, 15);

  if (year >= 1967) add(2, 11);

  if (year >= 2020) add(2, 23);
  else if (year >= 1989 && year <= 2018) add(12, 23);

  add(3, equinoxDay(year, "spring"));

  if (year >= 1949) add(4, 29);

  add(5, 3);
  if (year >= 2007) add(5, 4);
  add(5, 5);

  if (year === 2020) add(7, 23);
  else if (year === 2021) add(7, 22);
  else if (year >= 2003) set.add(nthWeekday(year, 7, 1, 3));
  else if (year >= 1996) add(7, 20);

  if (year === 2020) add(8, 10);
  else if (year === 2021) add(8, 8);
  else if (year >= 2016) add(8, 11);

  if (year >= 2003) set.add(nthWeekday(year, 9, 1, 3));
  else if (year >= 1966) add(9, 15);

  add(9, equinoxDay(year, "autumn"));

  if (year === 2020) add(7, 24);
  else if (year === 2021) add(7, 23);
  else if (year >= 2000) set.add(nthWeekday(year, 10, 1, 2));
  else if (year >= 1966) add(10, 10);

  add(11, 3);
  add(11, 23);

  for (const key of EXTRA_NATIONAL[year] ?? []) set.add(key);
  return set;
}

function substituteFor(sundayKey: string, national: Set<string>): string | null {
  if (sundayKey < SUBSTITUTE_FROM) return null;
  let cursor = addDays(parseKey(sundayKey), 1);
  let key = formatDateOnly(cursor);
  if (sundayKey < SUBSTITUTE_SKIP_FROM) {
    return national.has(key) ? null : key;
  }
  let guard = 0;
  while (national.has(key) && guard < 14) {
    cursor = addDays(cursor, 1);
    key = formatDateOnly(cursor);
    guard += 1;
  }
  return key;
}

function computeHolidays(year: number): Set<string> {
  const national = new Set<string>();
  for (const y of [year - 1, year, year + 1]) {
    for (const key of nationalHolidays(y)) national.add(key);
  }

  const result = new Set<string>();
  for (const key of national) {
    if (parseKey(key).getFullYear() === year) result.add(key);
  }

  for (const key of national) {
    if (parseKey(key).getDay() !== 0) continue;
    const substitute = substituteFor(key, national);
    if (!substitute) continue;
    if (parseKey(substitute).getFullYear() === year) result.add(substitute);
  }

  let cursor = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  while (cursor.getTime() <= end.getTime()) {
    const key = formatDateOnly(cursor);
    if (key >= CITIZENS_FROM && !national.has(key)) {
      const prev = formatDateOnly(addDays(cursor, -1));
      const next = formatDateOnly(addDays(cursor, 1));
      if (national.has(prev) && national.has(next)) result.add(key);
    }
    cursor = addDays(cursor, 1);
  }

  return result;
}
