const nodemailer = require('nodemailer');

// ── Gmail transporter ─────────────────────────────────────────────────────────
// Requires two Railway env vars:
//   GMAIL_USER         → the Gmail account sending the alert (e.g. convosyncai@gmail.com)
//   GMAIL_APP_PASSWORD → 16-char App Password from Google (not your normal password)
//   ALERT_EMAIL        → recipient(s), comma-separated (e.g. you@gmail.com,boss@gmail.com)

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[EMAIL] GMAIL_USER or GMAIL_APP_PASSWORD not set — email alerts disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   587,
    secure: false,   // STARTTLS on port 587 (not SSL on 465)
    family: 4,       // force IPv4 — Railway blocks outbound IPv6 SMTP
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  console.log(`[EMAIL] Transporter ready — sending from ${process.env.GMAIL_USER} to ${process.env.ALERT_EMAIL || process.env.GMAIL_USER}`);
  return transporter;
}

// ── Severity colour for HTML email ───────────────────────────────────────────
const SEVERITY_COLOUR = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      '#6b7280',
};

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Send a critical threat alert email.
 * Silently does nothing if env vars are missing.
 *
 * @param {object} incident  - Saved Incident document
 * @param {object} device    - Device document from MongoDB
 */
async function sendCriticalAlert(incident, device) {
  console.log(`[EMAIL] sendCriticalAlert called — type=${incident.type} severity=${incident.severity} device=${device.name}`);
  const mailer = getTransporter();
  if (!mailer) return;

  const recipients = process.env.ALERT_EMAIL || process.env.GMAIL_USER;
  const colour     = SEVERITY_COLOUR[incident.severity] || '#6b7280';
  const time       = new Date(incident.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const subject = `🚨 CRITICAL THREAT — ${device.name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 8px; overflow: hidden;">

      <!-- Header -->
      <div style="background: ${colour}; padding: 20px 24px;">
        <h1 style="margin: 0; font-size: 20px; color: #fff;">🚨 Critical Security Alert</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">ThreatNest IoT Security System</p>
      </div>

      <!-- Body -->
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px; width: 140px;">Device</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; font-weight: bold;">${device.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">IP Address</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px;">${device.ipAddress || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Location</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px;">${device.location || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Threat Type</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px;">
              <span style="background: ${colour}22; color: ${colour}; padding: 2px 10px; border-radius: 4px; font-weight: bold;">${incident.type}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Severity</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px;">
              <span style="color: ${colour}; font-weight: bold;">${incident.severity}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Time (IST)</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #94a3b8; font-size: 13px; vertical-align: top;">Details</td>
            <td style="padding: 10px 0; font-size: 13px; color: #cbd5e1;">${incident.details}</td>
          </tr>
        </table>

        <div style="margin-top: 24px; padding: 12px 16px; background: #1e293b; border-left: 3px solid ${colour}; border-radius: 4px; font-size: 12px; color: #94a3b8;">
          Incident ID: <span style="font-family: monospace; color: #e2e8f0;">${incident.incidentId || incident._id}</span>
          <br/>Device has been automatically set to <strong style="color: ${colour};">Blocked</strong> status.
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 16px 24px; background: #020617; font-size: 11px; color: #475569; text-align: center;">
        ThreatNest — Cloud-Based Incident Response System for IoT Environments
      </div>
    </div>
  `;

  await mailer.sendMail({
    from:    `"ThreatNest Alerts" <${process.env.GMAIL_USER}>`,
    to:      recipients,
    subject,
    html,
  });

  console.log(`[EMAIL] Critical alert sent to ${recipients} — ${incident.type} on ${device.name}`);
}

module.exports = { sendCriticalAlert };
