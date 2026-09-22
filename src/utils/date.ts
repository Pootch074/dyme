/** Formats a Date as a local, timezone-safe YYYY-MM-DD string (no UTC conversion). */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formats a Date as a local HH:mm string, for binding to <input type="time">. */
export function toTimeOnlyString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Returns a copy of `base` with its year/month/day replaced from a YYYY-MM-DD string. */
export function withDatePart(base: Date, dateOnly: string): Date {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const next = new Date(base);
  next.setFullYear(year, month - 1, day);
  return next;
}

/** Returns a copy of `base` with its hours/minutes replaced from an HH:mm string. */
export function withTimePart(base: Date, timeOnly: string): Date {
  const [hours, minutes] = timeOnly.split(':').map(Number);
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

/** Renders a date as e.g. "Jun 15, 2025". */
export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Renders the time-of-day as e.g. "3:45 PM". */
export function formatTimeOnly(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Renders a date and time as e.g. "Jun 15, 2025, 3:45 PM". */
export function formatDisplayDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Renders how long ago `date` was relative to `now` (defaults to the current time), e.g. "3 days ago". */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / dayMs);

  if (days < 0) return 'In the future';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  if (days < 365) {
    const months = Math.round(days / 30.44);
    return months <= 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.round(days / 365.25);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
