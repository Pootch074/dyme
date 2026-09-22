import { type DtrPeriod, periodLabel } from './dtr-period';

import type { DtrEntry } from '@/hooks/use-dtr';
import type { Profile } from '@/hooks/use-profile';
import { toDateOnlyString } from './date';

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime12(hhmm: string | null): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function hoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

/** Regular hours worked, only when all four times are present (never estimated). */
function computeRegHours(entry: DtrEntry | undefined): number | null {
  if (!entry?.amIn || !entry.lunchOut || !entry.lunchIn || !entry.pmOut) return null;
  const hours = hoursBetween(entry.amIn, entry.lunchOut) + hoursBetween(entry.lunchIn, entry.pmOut);
  return hours > 0 ? hours : null;
}

type BuildDtrHtmlOptions = {
  period: DtrPeriod;
  entries: DtrEntry[];
  profile: Profile;
};

function buildCopyHtml(options: BuildDtrHtmlOptions): string {
  const { period, entries, profile } = options;
  const entryByDate = new Map(entries.map((entry) => [entry.date, entry]));

  const rows: string[] = [];
  let totalWorkingDays = 0;
  let totalHours = 0;

  for (let day = period.startDay; day <= period.endDay; day++) {
    const date = new Date(period.year, period.month, day);
    const entry = entryByDate.get(toDateOnlyString(date));
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const hasAnyTime = Boolean(entry?.amIn || entry?.lunchOut || entry?.lunchIn || entry?.pmOut);
    const regHours = computeRegHours(entry);
    const remarks = !hasAnyTime && !isWeekend ? 'ABSENT' : '';

    if (hasAnyTime) totalWorkingDays += 1;
    if (regHours !== null) totalHours += regHours;

    rows.push(`
      <tr>
        <td>${day}</td>
        <td>${WEEKDAY_ABBR[weekday]}</td>
        <td>${formatTime12(entry?.amIn ?? null)}</td>
        <td>${formatTime12(entry?.lunchOut ?? null)}</td>
        <td>${formatTime12(entry?.lunchIn ?? null)}</td>
        <td>${formatTime12(entry?.pmOut ?? null)}</td>
        <td></td>
        <td></td>
        <td></td>
        <td>${regHours !== null ? regHours.toFixed(2) : ''}</td>
        <td>${remarks}</td>
      </tr>
    `);
  }

  const name = escapeHtml(profile.name || 'NAME NOT SET').toUpperCase();
  const entity = escapeHtml(profile.entity);
  const employeeNo = escapeHtml(profile.employeeNo);

  return `
    <div class="copy">
      <div class="header">
        <div class="agency">DEPARTMENT OF SOCIAL WELFARE AND DEVELOPMENT</div>
        <div class="title">DAILY TIME RECORD</div>
        <div class="range">${periodLabel(period)}</div>
      </div>

      <div class="meta">
        <div>
          <strong>Name:</strong> ${name}<br/>
          <strong>Entity:</strong> ${entity}
        </div>
        <div class="meta-right"><strong>Emp. No.:</strong> ${employeeNo}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2">Date</th>
            <th rowspan="2">Day</th>
            <th colspan="2">A.M.</th>
            <th colspan="2">P.M.</th>
            <th rowspan="2">Late</th>
            <th rowspan="2">UT</th>
            <th rowspan="2">OT</th>
            <th rowspan="2">REG<br/>HRS</th>
            <th rowspan="2">REMARKS</th>
          </tr>
          <tr>
            <th>IN</th>
            <th>OUT</th>
            <th>IN</th>
            <th>OUT</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
          <tr class="totals-row">
            <td colspan="2">Total Working Days: ${totalWorkingDays || ''}</td>
            <td colspan="7"></td>
            <td>Total: ${totalHours > 0 ? totalHours.toFixed(2) : ''}</td>
          </tr>
        </tbody>
      </table>

      <div class="cert">
        I certify on my honor that the above is true and correct report of the hours of work
        performed, record of which was made daily at the time of arrival at and departure from
        office.
      </div>

      <div class="sign-block">
        <div class="sign-col">
          <div class="sign-line">${name}</div>
          <div class="sign-caption">Verified as to the prescribed office hours</div>
        </div>
        <div class="sign-col">
          <div class="sign-line">&nbsp;</div>
          <div class="sign-caption">Signature of the Immediate Supervisor</div>
        </div>
      </div>
    </div>
  `;
}

/** Builds a print-ready HTML document reproducing the DSWD Daily Time Record form, two copies per page. */
export function buildDtrHtml(options: BuildDtrHtmlOptions): string {
  const copyHtml = buildCopyHtml(options);
  const title = `DTR ${periodLabel(options.period)}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            margin: 0;
            -webkit-print-color-adjust: exact;
          }
          .sheet { display: flex; gap: 10mm; align-items: flex-start; }
          .copy { flex: 1; min-width: 0; }
          .header { text-align: center; margin-bottom: 6px; }
          .header .agency,
          .header .title { font-weight: bold; font-size: 11px; }
          .header .range { font-size: 10px; margin-top: 2px; }
          .meta { display: flex; justify-content: space-between; align-items: flex-start; font-size: 9px; margin-bottom: 6px; gap: 8px; }
          .meta-right { white-space: nowrap; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed; }
          th, td { border: 1px solid #000; text-align: center; padding: 2px; overflow: hidden; }
          th { font-weight: bold; }
          .totals-row td { text-align: left; font-weight: bold; padding-left: 4px; }
          .cert { font-size: 8px; margin-top: 8px; line-height: 1.4; }
          .sign-block { display: flex; justify-content: space-between; margin-top: 26px; gap: 12px; }
          .sign-col { flex: 1; text-align: center; }
          .sign-line { border-top: 1px solid #000; font-weight: bold; font-size: 9px; padding-top: 2px; }
          .sign-caption { font-size: 8px; margin-top: 1px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          ${copyHtml}
          ${copyHtml}
        </div>
      </body>
    </html>
  `;
}
