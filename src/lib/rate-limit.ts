/**
 * Simple in-memory sliding-window rate limiter.
 * No external dependencies required.
 * 
 * SECURITY: Prevents brute-force attacks on admin login,
 * wallet abuse, and LLM API cost exploitation via chat.
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
    timestamps: number[];
}

// In-memory store (resets on server restart — acceptable for Next.js API routes)
const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
        if (entry.timestamps.length === 0) store.delete(key);
    }
}, 300_000);

/**
 * Check rate limit for a given request.
 * @param req - The incoming request (IP is extracted from headers)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns NextResponse with 429 if rate limited, or null if allowed
 */
export function checkRateLimit(
    req: NextRequest,
    maxRequests: number,
    windowMs: number
): NextResponse | null {
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";

    const key = `${req.nextUrl.pathname}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= maxRequests) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.ceil(windowMs / 1000)),
                },
            }
        );
    }

    entry.timestamps.push(now);
    return null; // Request is allowed
}
