import { LOGO_B64 } from './logoBase64';

const HELPLINE = '+977 98520 24 365';
const WEBSITE  = 'www.homesewa.app';
const PRIMARY  = '#295C59';

export function buildBookingPdfHtml(booking: any): string {
  const location = [booking.area, booking.city].filter(Boolean).join(', ');
  const approxDays = booking.approxDays != null
    ? `${booking.approxDays} Day${booking.approxDays !== 1 ? 's' : ''}`
    : null;

  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr>
           <td class="lbl">${label}</td>
           <td class="val">${value}</td>
         </tr>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: 1080px;
    min-height: 1920px;
    background: #f4f8f7;
    font-family: Arial, Helvetica, sans-serif;
    color: #1C2B2A;
  }

  /* ── HEADER ── */
  .header {
    background: ${PRIMARY};
    width: 100%;
    padding: 70px 80px 60px;
    display: flex;
    align-items: center;
    gap: 40px;
  }
  .logo {
    width: 140px;
    height: 140px;
    object-fit: contain;
    border-radius: 24px;
    background: rgba(255,255,255,0.12);
    padding: 10px;
  }
  .brand { flex: 1; }
  .brand-name {
    font-size: 68px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 1px;
  }
  .brand-tag {
    font-size: 30px;
    color: rgba(255,255,255,0.72);
    margin-top: 6px;
    font-weight: 400;
  }
  .helpline-block { text-align: right; }
  .helpline-label {
    font-size: 22px;
    color: rgba(255,255,255,0.6);
    font-weight: 500;
  }
  .helpline-number {
    font-size: 34px;
    color: #fff;
    font-weight: 800;
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  /* ── RECEIPT BADGE ── */
  .receipt-bar {
    background: #E8F4F3;
    padding: 28px 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid ${PRIMARY};
  }
  .receipt-title {
    font-size: 40px;
    font-weight: 800;
    color: ${PRIMARY};
  }
  .booking-id {
    font-size: 30px;
    color: #555;
    font-weight: 600;
  }

  /* ── CARD ── */
  .card {
    background: #fff;
    margin: 60px 80px;
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(41,92,89,0.10);
  }
  .card-header {
    background: ${PRIMARY};
    padding: 40px 56px 36px;
  }
  .customer-name {
    font-size: 50px;
    font-weight: 800;
    color: #fff;
  }
  .customer-phone {
    font-size: 28px;
    color: rgba(255,255,255,0.80);
    margin-top: 10px;
    font-weight: 500;
  }

  /* Status badge */
  .status-badge {
    display: inline-block;
    margin-top: 18px;
    padding: 8px 28px;
    border-radius: 50px;
    font-size: 24px;
    font-weight: 700;
    background: rgba(255,255,255,0.18);
    color: #fff;
    letter-spacing: 0.5px;
  }

  /* Detail table */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  tr { border-bottom: 1.5px solid #F0F7F6; }
  tr:last-child { border-bottom: none; }
  td { padding: 28px 56px; vertical-align: top; }
  .lbl {
    width: 38%;
    font-size: 24px;
    font-weight: 700;
    color: #9BBAB8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding-right: 20px;
  }
  .val {
    font-size: 30px;
    font-weight: 600;
    color: #1C2B2A;
    line-height: 1.4;
  }

  /* ── FOOTER ── */
  .footer {
    background: ${PRIMARY};
    padding: 44px 80px;
    text-align: center;
    margin-top: auto;
  }
  .footer-text {
    font-size: 26px;
    color: rgba(255,255,255,0.75);
    font-weight: 500;
  }
  .footer-website {
    font-size: 30px;
    color: #fff;
    font-weight: 800;
    margin-top: 8px;
    letter-spacing: 0.5px;
  }

  /* spacer pushes footer to bottom */
  .spacer { flex: 1; }
</style>
</head>
<body style="display:flex;flex-direction:column;">

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
    <div class="booking-id">ID #${booking.bookingId ?? '—'}</div>
  </div>

  <!-- DETAIL CARD -->
  <div class="card">
    <div class="card-header">
      <div class="customer-name">${booking.fullName ?? '—'}</div>
      <div class="customer-phone">📞 +977 ${booking.phone ?? '—'}</div>
      ${booking.status ? `<div class="status-badge">${booking.status}</div>` : ''}
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

  <div class="spacer"></div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-text">Generated by HomeSewa · Thank you for choosing us!</div>
    <div class="footer-website">${WEBSITE}</div>
  </div>

</body>
</html>`;
}
