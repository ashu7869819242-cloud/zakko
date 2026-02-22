/**
 * GET /api/wallet/lookup?code=ABCDEF — Look up a user by uniqueCode
 * 
 * Returns minimal info (name + code) for P2P transfer preview.
 * Requires Firebase ID token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/user-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code || code.trim().length < 4) {
        return NextResponse.json({ error: "Valid code is required" }, { status: 400 });
    }

    try {
        const snap = await adminDb
            .collection("users")
            .where("uniqueCode", "==", code.toUpperCase().trim())
            .limit(1)
            .get();

        if (snap.empty) {
            return NextResponse.json({ error: "No user found" }, { status: 404 });
        }

        const userData = snap.docs[0].data();

        return NextResponse.json({
            name: userData.name,
            uniqueCode: userData.uniqueCode,
        });
    } catch (error) {
        console.error("Lookup failed:", error);
        return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }
}
