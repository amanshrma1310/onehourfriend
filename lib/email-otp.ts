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
  // Generate random 6-digit code
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
    return { valid: false, error: "Invalid 6-digit verification code. Please try again." };
  }

  // Verification successful: consume OTP
  otpStore.delete(normalizedEmail);
  return { valid: true };
}

export async function sendOtpEmail(email: string, code: string): Promise<{ success: boolean; previewCode?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[EMAIL OTP] Generated 6-digit code for ${normalizedEmail}: ${code}`);

  // If custom SMTP or Resend API key is configured in env:
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "One Hour Friend <verify@onehourfriend.com>",
          to: [normalizedEmail],
          subject: `🔐 Your One Hour Friend Verification Code: ${code}`,
          html: `
            <div style="font-family: Arial, sans-serif; background-color: #121218; color: #ffffff; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto;">
              <h2 style="color: #872bf5; font-size: 24px; margin-bottom: 8px;">One Hour Friend</h2>
              <p style="font-size: 14px; color: #a1a1aa;">Use this 6-digit code to verify your email and activate your account:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #ffffff; background-color: #1f1f2e; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0; border: 1px solid #872bf5;">
                ${code}
              </div>
              <p style="font-size: 12px; color: #71717a;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error("Resend email dispatch error:", e);
    }
  }

  // Return success with previewCode for seamless immediate testing
  return { success: true, previewCode: code };
}
