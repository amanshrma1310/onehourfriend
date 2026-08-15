/**
 * Comprehensive Security, Anti-Bot, Anti-XSS, and Anti-Malware Suite
 */

// 1. In-Memory Sliding Window Rate Limiter
interface RateLimitRecord {
  timestamps: number[];
}

const ipRequestMap = new Map<string, RateLimitRecord>();

// Clean up stale IPs every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [key, record] of ipRequestMap.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      ipRequestMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 20,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = ipRequestMap.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    ipRequestMap.set(identifier, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
  };
}

// 2. Client IP Extractor (Handles proxy headers safely)
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

// 3. Honeypot Bot Detector
export function isBotHoneypotTriggered(body: any): boolean {
  // If hidden honeypot fields contain any value, a bot filled them
  if (body?.website || body?.phone_check || body?.company_hp) {
    return true;
  }
  return false;
}

// 4. Advanced Anti-XSS & Script Sanitizer
export function sanitizeText(input: string | null | undefined, maxLength: number = 2000): string {
  if (!input) return "";

  let clean = input.slice(0, maxLength);

  // Remove null bytes and control characters
  clean = clean.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Strip script tags and HTML tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Strip inline JavaScript event handlers (onerror=, onclick=, onload=, etc.)
  clean = clean.replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*[^\s>]+/gi, "");

  // Strip javascript: and vbscript: URIs
  clean = clean.replace(/javascript\s*:/gi, "blocked-js:");
  clean = clean.replace(/vbscript\s*:/gi, "blocked-vbs:");
  clean = clean.replace(/data\s*:\s*text\/html/gi, "blocked-data:");

  // Neutralize raw HTML brackets
  clean = clean.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return clean.trim();
}

// 5. Anti-Malware / Virus Link & Executable Filter
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".vbs", ".ps1", ".scr", ".pif", ".msi", ".apk", ".jar", ".hta", ".cpl", ".dll", ".sh"
];

export function containsMaliciousLinkOrCode(text: string): boolean {
  const lower = text.toLowerCase();

  // Check for executable files
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lower.includes(ext)) {
      return true;
    }
  }

  // Check for obfuscated base64 data payloads
  if (lower.includes("data:application/x-") || lower.includes("base64,tvqqaamaaaa")) {
    return true;
  }

  return false;
}
