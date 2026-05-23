const { Resend } = require('resend');

// ── Resend HTTP-based email (works on Railway — no SMTP blocking) ─────────────
// Requires one Railway env var:
//   RESEND_API_KEY  → API key from resend.com (free: 100 emails/day)
//   ALERT_EMAIL     → recipient email address

let resend = null;

function getClient() {
  if (resend) return resend;

  if (!process.env.RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY not set — email alerts disabled');
    return null;
  }

  resend = new Resend(process.env.RESEND_API_KEY);
  console.log(`[EMAIL] Resend client ready — alerts will go to ${process.env.ALERT_EMAIL}`);
  return resend;
}

// ── Severity colour ───────────────────────────────────────────────────────────
const SEVERITY_COLOUR = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      '#6b7280',
};

// ── Main export ───────────────────────────────────────────────────────────────
async function sendCriticalAlert(incident, device) {
  console.log(`[EMAIL] sendCriticalAlert called — type=${incident.type} severity=${incident.severity} device=${device.name}`);

  const client = getClient();
  if (!client) return;

  const recipient = process.env.ALERT_EMAIL;
  const colour    = SEVERITY_COLOUR[incident.severity] || '#6b7280';
  const time      = new Date(incident.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const { data, error } = await client.emails.send({
    from:    'ThreatNest <onboarding@resend.dev>',
    to:      [recipient],
    subject: `🚨 CRITICAL THREAT — ${device.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 8px; overflow: hidden;">

        <div style="background: ${colour}; padding: 20px 24px;">
          <h1 style="margin: 0; font-size: 20px; color: #fff;">🚨 Critical Security Alert</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">ThreatNest IoT Security System</p>
        </div>

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
            Incident ID: <span style="font-family: monospace; color: #e2e8f0;">${incident.incidentId || incident._id}</span><br/>
            Device has been automatically set to <strong style="color: ${colour};">Blocked</strong> status.
          </div>
        </div>

        <div style="padding: 16px 24px; background: #020617; font-size: 11px; color: #475569; text-align: center;">
          ThreatNest — Cloud-Based Incident Response System for IoT Environments
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('[EMAIL] Resend error:', error.message);
    return;
  }

  console.log(`[EMAIL] Alert sent successfully to ${recipient} — ${incident.type} on ${device.name} (id: ${data.id})`);
}

module.exports = { sendCriticalAlert };
