import { NextResponse } from "next/server";
import { generateOtp, sendOtpEmail } from "@/lib/email-otp";
import { checkRateLimit, getClientIp, sanitizeText } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Rate limit: max 10 OTP requests per IP per 5 minutes
    const rateCheck = checkRateLimit(`otp_${ip}`, 10, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rateCheck.retryAfter}s before requesting a new code.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    const cleanEmail = sanitizeText(email, 100);
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json({ error: "Please enter a valid Gmail / email address" }, { status: 400 });
    }

    const code = generateOtp(cleanEmail);
    const result = await sendOtpEmail(cleanEmail, code);

    if (result.sentViaEmail) {
      return NextResponse.json({
        success: true,
        sentViaEmail: true,
        message: `6-digit verification code sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      });
    } else {
      return NextResponse.json({
        success: true,
        sentViaEmail: false,
        fallbackCode: code,
        message: `Verification code generated! (SMTP credentials not yet added in .env, use code: ${code})`,
      });
    }
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: error.message || "Failed to send verification code" }, { status: 500 });
  }
}
