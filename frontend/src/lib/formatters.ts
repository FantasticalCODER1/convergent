import { format, isSameDay, parseISO } from 'date-fns';
import type { UserRole } from '../types/User';

function toDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function isUtcMidnightString(value?: string | Date | null) {
  return typeof value === 'string' && /T00:00:00(?:\.000)?Z$/u.test(value);
}

function formatUtcDateLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T/u);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return format(date, 'EEE, d MMM yyyy');
}

export function formatDateLabel(value?: string | Date | null, fallback = 'TBD') {
  if (typeof value === 'string' && isUtcMidnightString(value)) {
    return formatUtcDateLabel(value) ?? fallback;
  }
  const date = toDate(value);
  return date ? format(date, 'EEE, d MMM yyyy') : fallback;
}

export function formatTimeLabel(value?: string | Date | null, fallback = 'TBD') {
  const date = toDate(value);
  return date ? format(date, 'p') : fallback;
}

export function formatTimestamp(value?: string | Date | null, fallback = 'Not available') {
  const date = toDate(value);
  return date ? format(date, 'd MMM yyyy, p') : fallback;
}

export function formatDateTimeRange(start?: string | Date | null, end?: string | Date | null, fallback = 'Schedule to be confirmed') {
  if (typeof start === 'string' && typeof end === 'string' && isUtcMidnightString(start) && isUtcMidnightString(end)) {
    const startLabel = formatUtcDateLabel(start);
    const endDate = end.match(/^(\d{4})-(\d{2})-(\d{2})T/u);
    if (startLabel && endDate) {
      const inclusiveEnd = new Date(Date.UTC(Number(endDate[1]), Number(endDate[2]) - 1, Number(endDate[3]) - 1));
      const endLabel = format(inclusiveEnd, 'EEE, d MMM yyyy');
      return startLabel === endLabel ? `${startLabel} • All day` : `${startLabel} - ${endLabel} • All day`;
    }
  }
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate) return fallback;
  if (!endDate) return `${format(startDate, 'EEE, d MMM yyyy')} • ${format(startDate, 'p')}`;
  if (isSameDay(startDate, endDate)) {
    return `${format(startDate, 'EEE, d MMM yyyy')} • ${format(startDate, 'p')} - ${format(endDate, 'p')}`;
  }
  return `${format(startDate, 'EEE, d MMM yyyy, p')} - ${format(endDate, 'EEE, d MMM yyyy, p')}`;
}

export function formatRelativeEventWindow(start?: string | Date | null, end?: string | Date | null) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate) return 'Schedule to be confirmed';
  if (!endDate) return `${format(startDate, 'd MMM')} at ${format(startDate, 'p')}`;
  if (isSameDay(startDate, endDate)) {
    return `${format(startDate, 'd MMM')} · ${format(startDate, 'p')} - ${format(endDate, 'p')}`;
  }
  return `${format(startDate, 'd MMM, p')} - ${format(endDate, 'd MMM, p')}`;
}

export function formatRoleLabel(role?: UserRole | string | null) {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'master':
      return 'Master';
    default:
      return 'Student';
  }
}
