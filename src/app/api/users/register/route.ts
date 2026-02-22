/**
 * POST /api/users/register — Server-side user profile creation
 * 
 * SECURITY: Replaces client-side Firestore writes during registration.
 * Validates all fields server-side and enforces walletBalance = 0.
 * Generates a globally unique 6-char alphanumeric code per user.
 * Requires a valid Firebase ID token.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import crypto from "crypto";

/**
 * Generate a random 6-char uppercase alphanumeric code.
 * Uses crypto.randomBytes for secure randomness.
 */
function generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
    const bytes = crypto.randomBytes(6);
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

/**
 * Generate a unique code with retry — checks Firestore for collisions.
 * Max 5 attempts before failing.
 */
async function generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        const existing = await adminDb
            .collection("users")
            .where("uniqueCode", "==", code)
            .limit(1)
            .get();
        if (existing.empty) return code;
    }
    throw new Error("Failed to generate unique code after 5 attempts");
}

export async function POST(req: NextRequest) {
    // SECURITY: Require Firebase ID token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let uid: string;
    let email: string | undefined;

    try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
        email = decoded.email;
    } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    try {
        const { name, rollNumber, phone } = await req.json();

        // Server-side validation
        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return NextResponse.json({ error: "Valid name is required (min 2 characters)" }, { status: 400 });
        }

        if (!rollNumber || typeof rollNumber !== "string" || rollNumber.trim().length < 3) {
            return NextResponse.json({ error: "Valid roll number is required (min 3 characters)" }, { status: 400 });
        }

        // Check if user already exists
        const existingDoc = await adminDb.collection("users").doc(uid).get();
        if (existingDoc.exists) {
            return NextResponse.json({ error: "User profile already exists" }, { status: 409 });
        }

        // Generate globally unique code
        const uniqueCode = await generateUniqueCode();

        // SECURITY: Create user doc server-side with enforced walletBalance = 0
        await adminDb.collection("users").doc(uid).set({
            uid,
            email: email || "",
            name: name.trim(),
            rollNumber: rollNumber.trim().toUpperCase(),
            phone: typeof phone === "string" ? phone.trim() : "",
            uniqueCode,
            role: "user",
            walletBalance: 0, // SECURITY: Always starts at zero — no client override
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, uniqueCode });
    } catch (error) {
        console.error("User registration failed:", error);
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }
}
