/**
 * GET /api/admin/verify
 * 
 * SECURITY: Server-side JWT verification endpoint.
 * Used by AdminGuard to confirm token validity before rendering admin pages.
 * This prevents the old bypass where any string in localStorage granted access.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
    const admin = verifyAdmin(req);

    if (!admin) {
        return NextResponse.json(
            { valid: false, error: "Invalid or expired token" },
            { status: 401 }
        );
    }

    return NextResponse.json({
        valid: true,
        username: admin.username,
    });
}
