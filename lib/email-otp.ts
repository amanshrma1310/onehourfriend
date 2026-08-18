import nodemailer from "nodemailer";

// Lightweight in-memory OTP store (10 minute validity)
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

// Clean expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

export function generateOtp(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  // Generate random 6-digit numeric code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(normalizedEmail, {
    code,
    expiresAt,
    attempts: 0,
  });

  return code;
}

export function verifyOtp(email: string, inputCode: string): { valid: boolean; error?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) {
    return { valid: false, error: "Verification code expired or not found. Please request a new code." };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: "Verification code has expired. Please request a new code." };
  }

  if (entry.attempts >= 5) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  entry.attempts += 1;

  if (entry.code !== inputCode.trim()) {
    return { valid: false, error: "Invalid 6-digit verification code. Please check your Gmail." };
  }

  // Verification successful: consume OTP
  otpStore.delete(normalizedEmail);
  return { valid: true };
}

// Create Nodemailer Transporter using Environment SMTP, Hostinger or Gmail
function getTransporter() {
  const rawUser = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER;
  const rawPass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (rawUser && rawPass) {
    const user = rawUser.trim();
    const pass = rawPass.replace(/\s+/g, "").trim();

    if (user.includes("@gmail.com")) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });
    }

    const host = process.env.SMTP_HOST || "smtp.hostinger.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

export async function sendOtpEmail(
  email: string,
  code: string
): Promise<{ success: boolean; sentViaEmail: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[EMAIL OTP] Dispatching 6-digit code for ${normalizedEmail}`);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0d12; margin: 0; padding: 20px; color: #ffffff; }
          .card { max-width: 480px; margin: 0 auto; background-color: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; text-align: center; }
          .logo { display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 14px; background-color: #872bf5; color: #ffffff; font-weight: 900; font-size: 16px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
          .desc { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 24px; }
          .code-box { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ffffff; background: linear-gradient(135deg, rgba(135,43,245,0.2), rgba(135,43,245,0.4)); border: 2px solid #872bf5; border-radius: 16px; padding: 18px 24px; margin: 20px 0; display: inline-block; }
          .footer { font-size: 11px; color: #71717a; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">1H</div>
          <div class="title">Verify Your Email Address</div>
          <div class="desc">Enter this 6-digit code to complete your registration on <strong>One Hour Friend</strong>:</div>
          <div class="code-box">${code}</div>
          <div class="desc">This verification code expires in 10 minutes. If you did not request this, you can safely ignore this email.</div>
          <div class="footer">🔒 One Hour Friend — 100% Anonymous & Safe Human Conversations</div>
        </div>
      </body>
    </html>
  `;

  // 1. Try sending via Nodemailer SMTP if configured
  const transporter = getTransporter();
  if (transporter) {
    try {
      const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER;
      await transporter.sendMail({
        from: `"One Hour Friend" <${fromAddress}>`,
        to: normalizedEmail,
        subject: `🔐 Your One Hour Friend Verification Code: ${code}`,
        html: htmlContent,
      });
      return { success: true, sentViaEmail: true };
    } catch (e: any) {
      console.error("Nodemailer dispatch error:", e);
      return { success: true, sentViaEmail: false, error: e.message };
    }
  }

  // 2. Try sending via Resend API if RESEND_API_KEY is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "One Hour Friend <verify@onehourfriend.com>",
          to: [normalizedEmail],
          subject: `🔐 Your One Hour Friend Verification Code: ${code}`,
          html: htmlContent,
        }),
      });
      if (res.ok) {
        return { success: true, sentViaEmail: true };
      }
    } catch (e) {
      console.error("Resend API error:", e);
    }
  }

  return { success: true, sentViaEmail: false };
}
