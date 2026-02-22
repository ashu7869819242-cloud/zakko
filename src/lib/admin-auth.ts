/**
 * Admin authentication helpers.
 * 
 * SECURITY: Replaces the insecure Base64 token with properly signed JWTs.
 * - signAdminToken() creates a signed JWT with ADMIN_SECRET (8h expiry)
 * - verifyAdmin() extracts + verifies the JWT from the Authorization header
 */

import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

interface AdminPayload {
    role: "admin";
    username: string;
}

/**
 * Create a signed JWT for an authenticated admin.
 */
export function signAdminToken(username: string): string {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
        throw new Error("ADMIN_SECRET not configured");
    }

    return jwt.sign(
        { role: "admin", username } as AdminPayload,
        secret,
        { expiresIn: "8h" }
    );
}

/**
 * Verify the admin JWT from the Authorization: Bearer header.
 * Returns the decoded payload if valid, or null if invalid/missing.
 */
export function verifyAdmin(req: NextRequest): AdminPayload | null {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) return null;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, secret) as AdminPayload;
        if (decoded.role !== "admin") return null;
        return decoded;
    } catch {
        return null;
    }
}
