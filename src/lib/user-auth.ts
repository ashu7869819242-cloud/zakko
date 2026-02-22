/**
 * User authentication helper for API routes.
 * 
 * SECURITY: Verifies Firebase ID tokens to ensure API callers are
 * authenticated users. Prevents IDOR attacks where one user accesses
 * another user's wallet/orders by passing a different userId.
 */

import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * Extract and verify the Firebase ID token from the Authorization header.
 * Returns the authenticated user's UID, or null if invalid/missing.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        return decoded.uid;
    } catch {
        return null;
    }
}
