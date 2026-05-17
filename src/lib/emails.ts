import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com';
const APP_NAME = 'POSAdmin';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function sendSubscriptionConfirmation({
  email,
  name,
  plan,
  endsAt,
}: {
  email: string;
  name: string;
  plan: string;
  endsAt: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `✅ Subscription activated — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f4f6fb;">
        <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
          
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#0d1f3c;border-radius:12px;padding:12px 20px;">
              <span style="color:#fff;font-size:18px;font-weight:700;">${APP_NAME}</span>
            </div>
          </div>

          <h2 style="color:#0d1f3c;font-size:20px;margin:0 0 8px;">Subscription activated! 🎉</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Hi ${name}, your payment was successful.</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Plan</td>
                <td style="color:#0d1f3c;font-size:13px;font-weight:600;text-align:right;text-transform:capitalize;">${plan}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Status</td>
                <td style="color:#16a34a;font-size:13px;font-weight:600;text-align:right;">✅ Active</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Next renewal</td>
                <td style="color:#0d1f3c;font-size:13px;font-weight:600;text-align:right;">${new Date(endsAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
            </table>
          </div>

          <a href="${APP_URL}/pos" style="display:block;background:#0d1f3c;color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px;">
            Open POS →
          </a>

          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
            Questions? Reply to this email or visit <a href="${APP_URL}/settings" style="color:#0d1f3c;">${APP_URL}/settings</a>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendSubscriptionReminder({
  email,
  name,
  plan,
  endsAt,
  daysLeft,
}: {
  email: string;
  name: string;
  plan: string;
  endsAt: string;
  daysLeft: number;
}) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ Your ${APP_NAME} subscription expires in ${daysLeft} days`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f4f6fb;">
        <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">

          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#0d1f3c;border-radius:12px;padding:12px 20px;">
              <span style="color:#fff;font-size:18px;font-weight:700;">${APP_NAME}</span>
            </div>
          </div>

          <h2 style="color:#b45309;font-size:20px;margin:0 0 8px;">Subscription expiring soon ⚠️</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px;">
            Hi ${name}, your <strong>${plan}</strong> subscription expires in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong> on ${new Date(endsAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:24px;">
            <p style="color:#92400e;font-size:13px;margin:0;">
              After expiry, your POS access will be limited. Renew now to keep everything running smoothly.
            </p>
          </div>

          <a href="${APP_URL}/settings?tab=billing" style="display:block;background:#0d1f3c;color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px;">
            Renew Subscription →
          </a>

          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
            You're receiving this because you have an active subscription on ${APP_NAME}.
          </p>
        </div>
      </div>
    `,
  });
}