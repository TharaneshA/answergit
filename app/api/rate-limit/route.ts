import { NextResponse } from "next/server";
import { RateLimiter } from "@/lib/rate-limiter";

// Helper to get client IP
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export async function GET(req: Request) {
  try {
    const clientIP = getClientIP(req);
    const rateLimit = await RateLimiter.check(clientIP);

    return NextResponse.json({
      success: true,
      ...rateLimit
    });
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check rate limit' },
      { status: 500 }
    );
  }
}
