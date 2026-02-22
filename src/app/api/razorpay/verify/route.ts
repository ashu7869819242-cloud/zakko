/**
 * POST /api/razorpay/verify — Verify Razorpay payment and credit wallet
 * 
 * Verifies payment signature using HMAC SHA256.
 * On success, credits wallet balance atomically via Firestore transaction.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/user-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    // SECURITY: Require Firebase ID token
    const uid = await getAuthenticatedUser(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount,
        } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
            return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
        }

        // SECURITY: Verify payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
        }

        // Convert amount from paise to rupees
        const amountInRupees = Math.round(amount / 100);

        if (amountInRupees < 1 || amountInRupees > 5000) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        // SECURITY: Atomic transaction — dedup check + credit wallet + record transaction
        await adminDb.runTransaction(async (transaction) => {
            // DEDUP: Check if this payment was already processed
            const paymentRef = adminDb.collection("payments").doc(razorpay_payment_id);
            const paymentDoc = await transaction.get(paymentRef);
            if (paymentDoc.exists) {
                throw new Error("Payment already processed");
            }

            const userRef = adminDb.collection("users").doc(uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new Error("User not found");
            }

            // Record payment for dedup
            transaction.set(paymentRef, {
                razorpayPaymentId: razorpay_payment_id,
                userId: uid,
                amount: amountInRupees,
                verified: true,
                createdAt: new Date().toISOString(),
            });

            // Credit wallet
            transaction.update(userRef, {
                walletBalance: FieldValue.increment(amountInRupees),
            });

            // Record wallet transaction
            const txnRef = adminDb.collection("walletTransactions").doc();
            transaction.set(txnRef, {
                userId: uid,
                fromUserId: "razorpay",
                toUserId: uid,
                type: "topup",
                amount: amountInRupees,
                description: `Wallet top-up via Razorpay`,
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                transactionId: txnRef.id,
                createdAt: new Date().toISOString(),
            });
        });

        return NextResponse.json({
            success: true,
            message: `₹${amountInRupees} added to wallet`,
        });
    } catch (error) {
        console.error("Payment verification failed:", error);
        const message = error instanceof Error ? error.message : "Payment verification failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
