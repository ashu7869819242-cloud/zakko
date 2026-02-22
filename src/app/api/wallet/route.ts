/**
 * Wallet API — GET balance/transactions + POST admin-only top-up
 * 
 * SECURITY CHANGES:
 * - GET: Requires Firebase ID token, enforces caller === userId
 * - POST: Admin-only top-up (no more self-service free money)
 * - Top-up uses Firestore transaction for atomic balance + txn record
 * - Rate limited (10 req/min)
 * - Removed `paymentVerified = true` bypass
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/user-auth";
import { verifyAdmin } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/wallet?userId=xxx — Fetch wallet balance + recent transactions
export async function GET(req: NextRequest) {
    // SECURITY: Rate limit
    const rateLimitResponse = checkRateLimit(req, 10, 60_000);
    if (rateLimitResponse) return rateLimitResponse;

    // SECURITY: Require Firebase ID token and verify ownership
    const uid = await getAuthenticatedUser(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // SECURITY: Prevent IDOR — user can only access their own wallet
    if (userId !== uid) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Fetch user wallet balance
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const walletBalance = userDoc.data()?.walletBalance || 0;

        // Fetch recent transactions
        const txnSnapshot = await adminDb
            .collection("walletTransactions")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();

        const transactions = txnSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ walletBalance, transactions });
    } catch (error) {
        console.error("Failed to fetch wallet:", error);
        return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
    }
}

// POST /api/wallet — Admin-only wallet top-up
export async function POST(req: NextRequest) {
    // SECURITY: Rate limit
    const rateLimitResponse = checkRateLimit(req, 10, 60_000);
    if (rateLimitResponse) return rateLimitResponse;

    // SECURITY: Only admin can top up wallets (removed self-service bypass)
    if (!verifyAdmin(req)) {
        return NextResponse.json(
            { error: "Unauthorized — only admin can add funds" },
            { status: 401 }
        );
    }

    try {
        const { userId, amount } = await req.json();

        if (!userId || !amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid userId or amount" }, { status: 400 });
        }

        if (amount > 5000) {
            return NextResponse.json({ error: "Maximum top-up is ₹5,000" }, { status: 400 });
        }

        // SECURITY: Atomic transaction — balance update + transaction record together
        await adminDb.runTransaction(async (transaction) => {
            const userRef = adminDb.collection("users").doc(userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new Error("User not found");
            }

            // Update balance atomically
            transaction.update(userRef, {
                walletBalance: FieldValue.increment(amount),
            });

            // Record the transaction atomically
            const txnRef = adminDb.collection("walletTransactions").doc();
            transaction.set(txnRef, {
                userId,
                type: "credit",
                amount,
                description: `Wallet top-up (Admin)`,
                transactionId: txnRef.id,
                createdAt: new Date().toISOString(),
            });
        });

        return NextResponse.json({
            success: true,
            message: `₹${amount} added to wallet`,
        });
    } catch (error) {
        console.error("Wallet top-up failed:", error);
        const message = error instanceof Error ? error.message : "Failed to process top-up";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
