const PHT_UTC_OFFSET_MINUTES = 8 * 60;

/**
 * The current Philippine time (PHT, UTC+8), from the device clock. The result's
 * local fields (getHours etc.) read as the PHT wall clock, so it can be fed to
 * the same local-time formatters and pickers as any other Date. On a device
 * already set to PHT this is just `new Date()`.
 */
export function nowInPHT(): Date {
  const now = new Date();
  return new Date(now.getTime() + (PHT_UTC_OFFSET_MINUTES + now.getTimezoneOffset()) * 60_000);
}

/** Formats a Date as a local, timezone-safe YYYY-MM-DD string (no UTC conversion). */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string into a local Date at midnight (no UTC shift). */
export function parseDateOnly(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
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

/** Renders the time-of-day as e.g. "3:45 PM", always 12-hour regardless of locale (DTR, records and shopping). */
export function formatTimeOnly12h(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from `from` to `to` (e.g. yesterday to today is 1), ignoring time of day. */
function daysBetween(from: Date, to: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / dayMs);
}

/** Adds `months` calendar months to `date`, clamping the day into the resulting month (Jan 31 + 1mo = Feb 28). */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInResultMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInResultMonth));
  return result;
}

/** Whole calendar months and remaining days from `from` to `to` (e.g. Jan 31 to Mar 1 is 1 month, 1 day). */
function monthsAndDaysBetween(from: Date, to: Date): { months: number; days: number } {
  const fromDay = startOfDay(from);
  const toDay = startOfDay(to);

  let months = (toDay.getFullYear() - fromDay.getFullYear()) * 12 + (toDay.getMonth() - fromDay.getMonth());
  if (addMonthsClamped(fromDay, months).getTime() > toDay.getTime()) {
    months -= 1;
  }

  const days = daysBetween(addMonthsClamped(fromDay, months), toDay);
  return { months, days };
}

/** Renders how long ago `date` was relative to `now` (defaults to the current time), e.g. "3 days ago". */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const days = daysBetween(date, now);

  if (days < 0) return 'In the future';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  if (days < 365) {
    const { months, days: remainingDays } = monthsAndDaysBetween(date, now);
    if (months === 0) {
      const weeks = Math.round(days / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }

    const monthPart = months === 1 ? '1 month' : `${months} months`;
    if (remainingDays === 0) return `${monthPart} ago`;

    const dayPart = remainingDays === 1 ? '1 day' : `${remainingDays} days`;
    return `${monthPart} and ${dayPart} ago`;
  }

  const years = Math.round(days / 365.25);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/** Renders a calendar-day section heading, e.g. "Today", "Yesterday", or "Jun 15, 2025". */
export function formatDateHeading(date: Date): string {
  const days = daysBetween(date, new Date());

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return formatDisplayDate(date);
}
