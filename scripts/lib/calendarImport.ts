import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const WEEKDAY_PATTERN = '(Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
const INDIA_OFFSET_MINUTES = 5 * 60 + 30;

export type CalendarDatasetRegistry = {
  datasets: CalendarDatasetEntry[];
};

export type CalendarDatasetEntry = {
  id: string;
  label: string;
  term?: string;
  file: string;
  csvFile?: string;
  lineFile?: string;
  rawFile?: string;
  active: boolean;
};

export type NormalizedCalendarEvent = {
  docId: string;
  title: string;
  description: string | null;
  clubId: string | null;
  type: 'club' | 'school' | 'competition';
  location: string | null;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  source: 'school_calendar';
  sourceDataset: string;
  sourceTerm: string | null;
  sourceId: string;
  sourceHash: string;
  importBatchId: string;
  rsvpCount: number;
};

type RawCalendarItem = Record<string, unknown>;

type ParsedLine = {
  dayNumber: number;
  monthIndex: number;
  weekday: string;
  title: string;
  normalizedTitle: string;
  date: Date;
};

type LineMatch = ParsedLine | null;

type NormalizedDatasetResult = {
  dataset: CalendarDatasetEntry;
  events: NormalizedCalendarEvent[];
};

export async function loadCalendarRegistry(rootDir: string) {
  const registryPath = path.resolve(rootDir, 'data/calendar/datasetsRegistry.json');
  return readJsonFile<CalendarDatasetRegistry>(registryPath);
}

export async function loadNormalizedDatasets(options: {
  rootDir: string;
  registry: CalendarDatasetRegistry;
  importBatchId: string;
  datasetIds?: string[];
  includeInactive?: boolean;
}) {
  const selected = selectDatasets(options.registry, options.datasetIds, options.includeInactive);
  const results: NormalizedDatasetResult[] = [];

  for (const dataset of selected) {
    results.push({
      dataset,
      events: await normalizeDataset({
        rootDir: options.rootDir,
        dataset,
        importBatchId: options.importBatchId
      })
    });
  }

  return results;
}

function selectDatasets(registry: CalendarDatasetRegistry, requestedIds?: string[], includeInactive?: boolean) {
  const requested = requestedIds?.filter(Boolean) ?? [];
  const available = includeInactive ? registry.datasets : registry.datasets.filter((dataset) => dataset.active);
  if (requested.length === 0) return available;

  const requestedSet = new Set(requested);
  const selected = registry.datasets.filter((dataset) => requestedSet.has(dataset.id));
  const missing = requested.filter((id) => !selected.some((dataset) => dataset.id === id));
  if (missing.length > 0) {
    throw new Error(`Unknown dataset id(s): ${missing.join(', ')}`);
  }
  return selected;
}

async function normalizeDataset(options: {
  rootDir: string;
  dataset: CalendarDatasetEntry;
  importBatchId: string;
}) {
  const datasetPath = path.resolve(options.rootDir, options.dataset.file);
  const records = await readJsonFile<unknown>(datasetPath);
  if (!Array.isArray(records)) {
    throw new Error(`Dataset ${options.dataset.id} must be a JSON array.`);
  }

  const rawItems = records.filter((item): item is RawCalendarItem => !!item && typeof item === 'object');
  const baseYear = extractYear(options.dataset.term ?? options.dataset.label) ?? new Date().getUTCFullYear();
  const parsedLines = options.dataset.lineFile
    ? await loadParsedLines(path.resolve(options.rootDir, options.dataset.lineFile), baseYear)
    : [];
  const lineMatches = matchActivitiesToLines(rawItems, parsedLines);

  return rawItems.map((item, index) =>
    normalizeRecord({
      dataset: options.dataset,
      item,
      index,
      baseYear,
      importBatchId: options.importBatchId,
      lineMatch: lineMatches[index]
    })
  );
}

function normalizeRecord(options: {
  dataset: CalendarDatasetEntry;
  item: RawCalendarItem;
  index: number;
  baseYear: number;
  importBatchId: string;
  lineMatch: LineMatch;
}): NormalizedCalendarEvent {
  const rawTitle = extractString(options.item, ['name', 'title', 'activity', 'event', 'summary']);
  const title = normalizeTitle(rawTitle);
  if (!title || !rawTitle) {
    throw new Error(`Dataset ${options.dataset.id} row ${options.index} is missing a title.`);
  }

  const term = extractString(options.item, ['term', 'sourceTerm']) ?? options.dataset.term ?? options.dataset.label ?? null;
  const location = extractString(options.item, ['venue', 'location', 'place']);
  const description = buildDescription(options.item);
  const clubId = deriveClubId(options.item);
  const type = normalizeType(extractString(options.item, ['type', 'category']), clubId);
  const schedule = resolveSchedule(options.item, {
    baseYear: options.baseYear,
    fallbackLine: options.lineMatch,
    title: rawTitle
  });

  const sourceHash = hashValue({
    dataset: options.dataset.id,
    normalizedTitle: title,
    resolvedStart: schedule.startTime.toISOString(),
    resolvedEnd: schedule.endTime.toISOString(),
    allDay: schedule.allDay,
    location,
    raw: options.item
  });
  const sourceId = `${options.dataset.id}:${sourceHash}`;
  const docId = `school_calendar__${options.dataset.id}__${sourceHash.slice(0, 20)}`;

  return {
    docId,
    title,
    description,
    clubId,
    type,
    location,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    allDay: schedule.allDay,
    source: 'school_calendar',
    sourceDataset: options.dataset.id,
    sourceTerm: term,
    sourceId,
    sourceHash,
    importBatchId: options.importBatchId,
    rsvpCount: 0
  };
}

function normalizeTitle(value: string | null) {
  if (!value) return null;
  return value.replace(/^\d{1,2}\s*[-–]\s*\d{1,2}\s+[A-Za-z]{3}\s+/u, '').trim() || null;
}

function buildDescription(item: RawCalendarItem) {
  const lines = [
    extractString(item, ['description', 'details']),
    withLabel('In charge', extractString(item, ['inCharge'])),
    withLabel('Boy in charge', extractString(item, ['boyInCharge'])),
    extractString(item, ['googleClassroomLink'])
  ].filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : null;
}

function withLabel(label: string, value: string | null) {
  return value ? `${label}: ${value}` : null;
}

function deriveClubId(item: RawCalendarItem) {
  return extractString(item, ['clubId', 'club_id']);
}

function normalizeType(value: string | null, clubId: string | null) {
  const normalized = value?.toLowerCase();
  if (normalized === 'competition') return 'competition';
  if (normalized === 'club') return 'club';
  if (normalized === 'school') return 'school';
  return clubId ? 'club' : 'school';
}

function resolveSchedule(
  item: RawCalendarItem,
  options: {
    baseYear: number;
    fallbackLine: LineMatch;
    title: string;
  }
) {
  const explicit = resolveExplicitSchedule(item, options.baseYear);
  if (explicit) return explicit;

  const inlineRange = resolveInlineDateRange(options.title, options.baseYear);
  if (inlineRange) return inlineRange;

  if (options.fallbackLine) {
    return {
      startTime: startOfUtcDay(options.fallbackLine.date),
      endTime: addUtcDays(startOfUtcDay(options.fallbackLine.date), 1),
      allDay: true
    };
  }

  throw new Error(`Unable to resolve a date for "${options.title}".`);
}

function resolveExplicitSchedule(item: RawCalendarItem, baseYear: number) {
  const dateText =
    extractString(item, ['date', 'eventDate', 'startDate', 'dayDate']) ??
    extractString(item, ['dateText', 'dayText']);
  const timeText = extractString(item, ['time', 'timeText', 'timing']);
  const explicitStartText = extractString(item, ['startTime', 'start']);
  const explicitEndText = extractString(item, ['endTime', 'end']);

  if (explicitStartText) {
    const startTime = parseExplicitDateTime(explicitStartText, baseYear);
    const endTime = explicitEndText ? parseExplicitDateTime(explicitEndText, baseYear) : startTime;
    return {
      startTime,
      endTime,
      allDay: false
    };
  }

  if (!dateText) return null;

  const date = parsePartialDate(dateText, baseYear);
  if (!date) return null;
  if (!timeText) {
    return {
      startTime: startOfUtcDay(date),
      endTime: addUtcDays(startOfUtcDay(date), 1),
      allDay: true
    };
  }

  const timeWindow = parseTimeWindow(date, timeText);
  if (!timeWindow) {
    return {
      startTime: startOfUtcDay(date),
      endTime: addUtcDays(startOfUtcDay(date), 1),
      allDay: true
    };
  }

  return timeWindow;
}

function parseExplicitDateTime(value: string, baseYear: number) {
  const normalized = value.trim();
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const partial = parsePartialDate(normalized, baseYear);
  if (!partial) {
    throw new Error(`Unsupported explicit datetime value: ${value}`);
  }

  return partial;
}

function parsePartialDate(value: string, baseYear: number) {
  const trimmed = value.trim();
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?(?:\s+(.*))?$/u);
  if (!match) return null;

  const monthIndex = monthToIndex(match[2]);
  if (monthIndex < 0) return null;
  const year = match[3] ? Number(match[3]) : baseYear;
  const date = new Date(Date.UTC(year, monthIndex, Number(match[1])));
  if (!match[4]) return date;

  const time = parseClockTime(match[4]);
  if (!time) return date;
  return buildIndiaLocalDate(year, monthIndex, Number(match[1]), time.hours, time.minutes);
}

function parseTimeWindow(date: Date, value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  const range = cleaned.split(/\s*(?:-|–|to)\s*/iu);
  const start = parseClockTime(range[0]);
  if (!start) return null;

  const startTime = buildIndiaLocalDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    start.hours,
    start.minutes
  );
  const end = range[1] ? parseClockTime(range[1]) : null;
  if (!end) {
    return {
      startTime,
      endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
      allDay: false
    };
  }

  return {
    startTime,
    endTime: buildIndiaLocalDate(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      end.hours,
      end.minutes
    ),
    allDay: false
  };
}

function parseClockTime(value: string) {
  const cleaned = value
    .replace(/\./g, ':')
    .replace(/\bhrs?\b/iu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/iu);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
}

function resolveInlineDateRange(title: string, baseYear: number) {
  const match = title.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]{3})\b/u);
  if (!match) return null;

  const monthIndex = monthToIndex(match[3]);
  if (monthIndex < 0) return null;

  const start = new Date(Date.UTC(baseYear, monthIndex, Number(match[1])));
  const endExclusive = new Date(Date.UTC(baseYear, monthIndex, Number(match[2]) + 1));
  return {
    startTime: start,
    endTime: endExclusive,
    allDay: true
  };
}

async function loadParsedLines(filePath: string, baseYear: number) {
  const lines = await readJsonFile<Array<{ text?: string }>>(filePath);
  const parsed: ParsedLine[] = [];
  let currentYear = baseYear;
  let lastMonthIndex = -1;

  for (const line of lines) {
    const text = String(line?.text ?? '').trim();
    const match = text.match(new RegExp(`^(\\d{1,2})\\s+([A-Za-z]{3})\\s+${WEEKDAY_PATTERN}\\s+(.*)$`, 'u'));
    if (!match) continue;

    const monthIndex = monthToIndex(match[2]);
    if (monthIndex < 0) continue;
    if (lastMonthIndex >= 0 && monthIndex < lastMonthIndex - 6) {
      currentYear += 1;
    }
    lastMonthIndex = monthIndex;

    parsed.push({
      dayNumber: Number(match[1]),
      monthIndex,
      weekday: match[3],
      title: match[4].trim(),
      normalizedTitle: normalizeForMatch(match[4]),
      date: new Date(Date.UTC(currentYear, monthIndex, Number(match[1])))
    });
  }

  return parsed;
}

function matchActivitiesToLines(items: RawCalendarItem[], lines: ParsedLine[]) {
  const matches: LineMatch[] = [];
  let cursor = 0;

  for (const item of items) {
    const title = normalizeForMatch(extractString(item, ['name', 'title', 'activity', 'event', 'summary']));
    const weekday = extractString(item, ['day', 'weekday']);
    if (!title || !weekday) {
      matches.push(null);
      continue;
    }

    let matched: ParsedLine | null = null;
    for (let index = cursor; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.weekday !== weekday) continue;
      if (line.normalizedTitle === title || line.normalizedTitle.includes(title) || title.includes(line.normalizedTitle)) {
        matched = line;
        cursor = index + 1;
        break;
      }
    }
    matches.push(matched);
  }

  return matches;
}

function extractYear(value?: string | null) {
  const match = value?.match(/\b(20\d{2})\b/u);
  return match ? Number(match[1]) : null;
}

function extractString(item: RawCalendarItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function hashValue(value: unknown) {
  return crypto.createHash('sha1').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeForMatch(value: string | null) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function monthToIndex(value: string) {
  return MONTHS.indexOf(value.slice(0, 3).toLowerCase() as (typeof MONTHS)[number]);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function buildIndiaLocalDate(year: number, monthIndex: number, day: number, hours: number, minutes: number) {
  return new Date(Date.UTC(year, monthIndex, day, hours, minutes) - INDIA_OFFSET_MINUTES * 60 * 1000);
}

async function readJsonFile<T>(filePath: string) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}
