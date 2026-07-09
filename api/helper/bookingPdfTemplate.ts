import { LOGO_B64 } from './logoBase64';

const HELPLINE = '+977 98520 24 365';
const WEBSITE  = 'www.homesewa.app';
const PRIMARY  = '#295C59';

// Booking fields come from customer-entered form data — escape before interpolating
// into HTML so a name/work-description containing markup can't corrupt the receipt.
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildBookingPdfHtml(booking: any): string {
  const location = [booking.area, booking.city].filter(Boolean).join(', ');
  const approxDays = booking.approxDays != null
    ? `${booking.approxDays} Day${booking.approxDays !== 1 ? 's' : ''}`
    : null;

  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr>
           <td class="lbl">${escapeHtml(label)}</td>
           <td class="val">${escapeHtml(value)}</td>
         </tr>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page { size: A4; margin: 0; }

  html, body {
    background: #f4f8f7;
    font-family: Arial, Helvetica, sans-serif;
    color: #1C2B2A;
  }

  /* ── HEADER ── */
  .header {
    background: ${PRIMARY};
    width: 100%;
    padding: 36px 48px 30px;
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .logo {
    width: 62px;
    height: 62px;
    object-fit: contain;
    border-radius: 12px;
    background: rgba(255,255,255,0.12);
    padding: 6px;
    flex-shrink: 0;
  }
  .brand { flex: 1; }
  .brand-name {
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.3px;
  }
  .brand-tag {
    font-size: 12px;
    color: rgba(255,255,255,0.72);
    margin-top: 2px;
    font-weight: 400;
  }
  .helpline-block { text-align: right; flex-shrink: 0; }
  .helpline-label {
    font-size: 10px;
    color: rgba(255,255,255,0.6);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .helpline-number {
    font-size: 14px;
    color: #fff;
    font-weight: 800;
    margin-top: 2px;
  }

  /* ── RECEIPT BADGE ── */
  .receipt-bar {
    background: #E8F4F3;
    padding: 16px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid ${PRIMARY};
  }
  .receipt-title {
    font-size: 18px;
    font-weight: 800;
    color: ${PRIMARY};
  }
  .booking-id {
    font-size: 13px;
    color: #555;
    font-weight: 600;
  }

  /* ── CARD ── */
  .card {
    background: #fff;
    margin: 30px 48px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(41,92,89,0.10);
  }
  .card-header {
    background: ${PRIMARY};
    padding: 20px 28px 18px;
  }
  .customer-name {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
  }
  .customer-phone {
    font-size: 12.5px;
    color: rgba(255,255,255,0.80);
    margin-top: 5px;
    font-weight: 500;
  }

  /* Status badge */
  .status-badge {
    display: inline-block;
    margin-top: 10px;
    padding: 4px 14px;
    border-radius: 50px;
    font-size: 11px;
    font-weight: 700;
    background: rgba(255,255,255,0.18);
    color: #fff;
    letter-spacing: 0.4px;
  }

  /* Detail table */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  tr { border-bottom: 1px solid #F0F7F6; }
  tr:last-child { border-bottom: none; }
  td { padding: 13px 28px; vertical-align: top; }
  .lbl {
    width: 34%;
    font-size: 11px;
    font-weight: 700;
    color: #9BBAB8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-right: 12px;
  }
  .val {
    font-size: 13.5px;
    font-weight: 600;
    color: #1C2B2A;
    line-height: 1.4;
  }

  /* ── FOOTER ── */
  .footer {
    background: ${PRIMARY};
    padding: 22px 48px;
    text-align: center;
  }
  .footer-text {
    font-size: 12px;
    color: rgba(255,255,255,0.75);
    font-weight: 500;
  }
  .footer-website {
    font-size: 13px;
    color: #fff;
    font-weight: 800;
    margin-top: 4px;
    letter-spacing: 0.4px;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <img class="logo" src="${LOGO_B64}" alt="HomeSewa Logo" />
    <div class="brand">
      <div class="brand-name">HomeSewa</div>
      <div class="brand-tag">Express Home Service</div>
    </div>
    <div class="helpline-block">
      <div class="helpline-label">Helpline</div>
      <div class="helpline-number">${HELPLINE}</div>
    </div>
  </div>

  <!-- RECEIPT BAR -->
  <div class="receipt-bar">
    <div class="receipt-title">Booking Receipt</div>
    <div class="booking-id">ID #B${escapeHtml(booking.bookingId ?? '—')}</div>
  </div>

  <!-- DETAIL CARD -->
  <div class="card">
    <div class="card-header">
      <div class="customer-name">${escapeHtml(booking.fullName ?? '—')}</div>
      <div class="customer-phone">📞 +977 ${escapeHtml(booking.phone ?? '—')}</div>
      ${booking.status ? `<div class="status-badge">${escapeHtml(booking.status)}</div>` : ''}
    </div>
    <table>
      ${row('Service',               booking.service)}
      ${row('Location',              location || null)}
      ${row('Budget',                booking.budget)}
      ${row('Booking Date',          booking.bookingDate)}
      ${row('Starting Date',         booking.startingDate)}
      ${row('Ending Date',           booking.completionDate)}
      ${row('Approx Days',           approxDays)}
      ${row('Special Request',       booking.specialRequests)}
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-text">Generated by HomeSewa · Thank you for choosing us!</div>
    <div class="footer-website">${WEBSITE}</div>
  </div>

</body>
</html>`;
}
