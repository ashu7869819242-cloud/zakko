/**
 * POST /api/wallet/transfer — Peer-to-peer wallet transfer via uniqueCode
 * 
 * SECURITY: Uses Firestore runTransaction() for atomic debit/credit.
 * Validates: auth, amount >= 1, sender != recipient, sufficient balance.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/user-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { recipientCode, amount } = await req.json();

        // Validate inputs
        if (!recipientCode || typeof recipientCode !== "string") {
            return NextResponse.json({ error: "Recipient code is required" }, { status: 400 });
        }

        const transferAmount = Number(amount);
        if (!transferAmount || transferAmount < 1) {
            return NextResponse.json({ error: "Amount must be at least ₹1" }, { status: 400 });
        }

        if (transferAmount > 5000) {
            return NextResponse.json({ error: "Maximum transfer is ₹5000" }, { status: 400 });
        }

        // Find recipient by uniqueCode
        const recipientSnap = await adminDb
            .collection("users")
            .where("uniqueCode", "==", recipientCode.toUpperCase().trim())
            .limit(1)
            .get();

        if (recipientSnap.empty) {
            return NextResponse.json({ error: "No user found with that code" }, { status: 404 });
        }

        const recipientDoc = recipientSnap.docs[0];
        const recipientId = recipientDoc.id;
        const recipientName = recipientDoc.data().name || "Unknown";

        // Prevent self-transfer
        if (recipientId === uid) {
            return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
        }

        // Atomic transaction: debit sender + credit receiver
        await adminDb.runTransaction(async (transaction) => {
            const senderRef = adminDb.collection("users").doc(uid);
            const receiverRef = adminDb.collection("users").doc(recipientId);

            const senderDoc = await transaction.get(senderRef);
            const receiverDoc = await transaction.get(receiverRef);

            if (!senderDoc.exists) throw new Error("Sender not found");
            if (!receiverDoc.exists) throw new Error("Recipient not found");

            const senderBalance = senderDoc.data()?.walletBalance || 0;
            if (senderBalance < transferAmount) {
                throw new Error("Insufficient wallet balance");
            }

            // Debit sender
            transaction.update(senderRef, {
                walletBalance: FieldValue.increment(-transferAmount),
            });

            // Credit receiver
            transaction.update(receiverRef, {
                walletBalance: FieldValue.increment(transferAmount),
            });

            const senderName = senderDoc.data()?.name || "Unknown";

            // Record debit transaction for sender
            const debitRef = adminDb.collection("walletTransactions").doc();
            transaction.set(debitRef, {
                userId: uid,
                fromUserId: uid,
                toUserId: recipientId,
                type: "transfer",
                amount: transferAmount,
                description: `Transfer to ${recipientName}`,
                transactionId: debitRef.id,
                createdAt: new Date().toISOString(),
            });

            // Record credit transaction for receiver
            const creditRef = adminDb.collection("walletTransactions").doc();
            transaction.set(creditRef, {
                userId: recipientId,
                fromUserId: uid,
                toUserId: recipientId,
                type: "transfer",
                amount: transferAmount,
                description: `Received from ${senderName}`,
                transactionId: creditRef.id,
                createdAt: new Date().toISOString(),
            });
        });

        return NextResponse.json({
            success: true,
            message: `₹${transferAmount} sent to ${recipientName}`,
        });
    } catch (error) {
        console.error("Transfer failed:", error);
        const message = error instanceof Error ? error.message : "Transfer failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
