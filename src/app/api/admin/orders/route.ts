/**
 * Admin Orders API — View all orders + Update order status/prepTime
 * 
 * SECURITY CHANGES:
 * - All handlers now require admin JWT verification via verifyAdmin()
 * - Returns 401 Unauthorized if token is missing or invalid
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { FieldValue } from "firebase-admin/firestore";

// SECURITY: Centralized auth check for all admin orders operations
function requireAdmin(req: NextRequest): NextResponse | null {
    if (!verifyAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}

export async function GET(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const snapshot = await adminDb
            .collection("orders")
            .orderBy("createdAt", "desc")
            .get();
        const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ orders });
    } catch (error) {
        console.error("Failed to fetch orders:", error);
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const { orderId, status, prepTime } = await req.json();
        if (!orderId) {
            return NextResponse.json({ error: "Order ID required" }, { status: 400 });
        }

        const orderRef = adminDb.collection("orders").doc(orderId);

        // Handle cancellation with refund
        if (status === "cancelled") {
            await adminDb.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists) throw new Error("Order not found");

                const orderData = orderDoc.data()!;

                // Prevent double-refund
                if (orderData.status === "cancelled") {
                    throw new Error("Order is already cancelled");
                }

                const userId = orderData.userId;
                const total = orderData.total;
                const orderIdDisplay = orderData.orderId;

                // 1. Update order status
                transaction.update(orderRef, {
                    status: "cancelled",
                    updatedAt: new Date().toISOString(),
                });

                // 2. Refund wallet balance
                const userRef = adminDb.collection("users").doc(userId);
                transaction.update(userRef, {
                    walletBalance: FieldValue.increment(total),
                });

                // 3. Record refund transaction
                const txnRef = adminDb.collection("walletTransactions").doc();
                transaction.set(txnRef, {
                    userId,
                    type: "refund",
                    amount: total,
                    description: `Refund - Order #${orderIdDisplay} Cancelled`,
                    transactionId: txnRef.id,
                    createdAt: new Date().toISOString(),
                });
            });

            return NextResponse.json({ success: true, refunded: true });
        }

        // Normal status/prepTime update (non-cancel)
        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };
        if (status) updateData.status = status;

        // When status is set to "ready", clear the countdown targets
        if (status === "ready") {
            updateData.readyAt = null;
            updateData.estimatedReadyAt = null;
        }

        if (prepTime) {
            updateData.prepTime = prepTime;
            const readyAtISO = new Date(
                Date.now() + prepTime * 60 * 1000
            ).toISOString();
            updateData.estimatedReadyAt = readyAtISO;
            updateData.readyAt = readyAtISO;

            // Auto-promote to "confirmed" if order is still pending and no explicit status was sent
            if (!status) {
                const currentDoc = await adminDb.collection("orders").doc(orderId).get();
                const currentStatus = currentDoc.data()?.status;
                if (currentStatus === "pending") {
                    updateData.status = "confirmed";
                }
            }
        }

        await orderRef.update(updateData);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update order:", error);
        const message = error instanceof Error ? error.message : "Failed to update order";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
