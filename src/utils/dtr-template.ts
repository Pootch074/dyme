import { daysInPeriod, type DtrPeriod, periodLabel } from './dtr-period';

import type { DtrEntry } from '@/hooks/use-dtr';
import { toDateOnlyString } from './date';

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// This DTR is generated for a single, fixed employee — set here rather than
// sourced from Profile, per the DSWD template's required header values.
const EMPLOYEE_NAME = 'YBALIO, BLADYMER ABENDAN';
const EMPLOYEE_ENTITY = 'Information and Communications Technology Management Section';
const EMPLOYEE_NO = '11-7815';

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

function buildRowsHtml(period: DtrPeriod, entryByDate: Map<string, DtrEntry>): string {
  const rows: string[] = [];

  for (let day = 1; day <= daysInPeriod(period); day++) {
    const date = new Date(period.year, period.month, day);
    const entry = entryByDate.get(toDateOnlyString(date));
    const weekday = date.getDay();

    // Late/UT/OT/REG HRS/REMARKS are left blank for manual completion — see
    // buildDtrHtml's doc comment for why they're never auto-filled.
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
        <td></td>
        <td></td>
      </tr>
    `);
  }

  return rows.join('');
}

type BuildDtrHtmlOptions = {
  period: DtrPeriod;
  entries: DtrEntry[];
};

/**
 * Builds a print-ready HTML document reproducing the DSWD Daily Time Record
 * form for every day of one full calendar month, folio-sized. REG HRS,
 * Total, Total Working Days, and REMARKS are intentionally left blank for
 * manual completion rather than guessed — computing them correctly needs an
 * official start time/grace-period policy this app doesn't have.
 */
export function buildDtrHtml({ period, entries }: BuildDtrHtmlOptions): string {
  const entryByDate = new Map(entries.map((entry) => [entry.date, entry]));
  const rowsHtml = buildRowsHtml(period, entryByDate);
  const title = `DTR ${periodLabel(period)}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: 215.9mm 330.2mm; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            margin: 0;
            -webkit-print-color-adjust: exact;
          }
          .header { text-align: center; margin-bottom: 8px; }
          .header .agency,
          .header .title { font-weight: bold; font-size: 13px; }
          .header .range { font-size: 11px; margin-top: 2px; }
          .meta { display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px; margin-bottom: 10px; gap: 8px; }
          .meta-right { white-space: nowrap; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
          th, td { border: 1px solid #000; text-align: center; padding: 3px; overflow: hidden; }
          th { font-weight: bold; }
          .totals-row td { text-align: left; font-weight: bold; padding-left: 4px; }
          .cert { font-size: 10px; margin-top: 12px; line-height: 1.5; }
          .sign-block { display: flex; justify-content: space-between; margin-top: 36px; gap: 16px; }
          .sign-col { flex: 1; text-align: center; }
          .sign-line { border-top: 1px solid #000; font-weight: bold; font-size: 11px; padding-top: 3px; }
          .sign-caption { font-size: 10px; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="agency">DEPARTMENT OF SOCIAL WELFARE AND DEVELOPMENT</div>
          <div class="title">DAILY TIME RECORD</div>
          <div class="range">${periodLabel(period)}</div>
        </div>

        <div class="meta">
          <div>
            <strong>Name:</strong> ${escapeHtml(EMPLOYEE_NAME)}<br/>
            <strong>Entity:</strong> ${escapeHtml(EMPLOYEE_ENTITY)}
          </div>
          <div class="meta-right"><strong>Emp. No.:</strong> ${escapeHtml(EMPLOYEE_NO)}</div>
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
            ${rowsHtml}
            <tr class="totals-row">
              <td colspan="2">Total Working Days:</td>
              <td colspan="7"></td>
              <td>Total:</td>
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
            <div class="sign-line">${escapeHtml(EMPLOYEE_NAME)}</div>
            <div class="sign-caption">Verified as to the prescribed office hours</div>
          </div>
          <div class="sign-col">
            <div class="sign-line">&nbsp;</div>
            <div class="sign-caption">Signature of the Immediate Supervisor</div>
          </div>
        </div>
      </body>
    </html>
  `;
}
