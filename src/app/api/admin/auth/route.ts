/**
 * POST /api/admin/auth
 * 
 * SECURITY CHANGES:
 * - Removed hardcoded credential fallbacks (fail if env vars missing)
 * - Replaced Base64 token with signed JWT via signAdminToken()
 * - Added rate limiting (5 requests per minute per IP)
 */

import { NextRequest, NextResponse } from "next/server";
import { signAdminToken } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    // SECURITY: Rate limit admin login attempts (5 per minute)
    const rateLimitResponse = checkRateLimit(req, 5, 60_000);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const { username, password } = await req.json();

        // SECURITY: No fallback defaults — fail if env vars not configured
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminUsername || !adminPassword) {
            console.error("[SECURITY] ADMIN_USERNAME or ADMIN_PASSWORD not configured");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        if (username !== adminUsername || password !== adminPassword) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // SECURITY: Sign a proper JWT instead of Base64 string
        const token = signAdminToken(username);

        return NextResponse.json({ token, success: true });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
