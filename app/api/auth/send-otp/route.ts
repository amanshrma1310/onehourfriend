import { NextResponse } from "next/server";
import { generateOtp, sendOtpEmail } from "@/lib/email-otp";
import { checkRateLimit, getClientIp, sanitizeText } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Rate limit: max 5 OTP requests per IP per 5 minutes
    const rateCheck = checkRateLimit(`otp_${ip}`, 5, 300);
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
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    const code = generateOtp(cleanEmail);
    const result = await sendOtpEmail(cleanEmail, code);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      previewCode: result.previewCode,
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: error.message || "Failed to send verification code" }, { status: 500 });
  }
}
