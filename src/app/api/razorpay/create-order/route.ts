/**
 * POST /api/razorpay/create-order — Create a Razorpay order
 * 
 * Requires Firebase ID token. Creates an order on Razorpay
 * and returns the order ID for frontend checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/user-auth";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
    // SECURITY: Require Firebase ID token
    const uid = await getAuthenticatedUser(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { amount } = await req.json();

        if (!amount || amount < 1 || amount > 5000) {
            return NextResponse.json(
                { error: "Amount must be between ₹1 and ₹5,000" },
                { status: 400 }
            );
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Razorpay expects paise
            currency: "INR",
            receipt: `wallet_${uid}_${Date.now()}`,
            notes: {
                userId: uid,
                purpose: "wallet_topup",
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error("Razorpay order creation failed:", error);
        return NextResponse.json(
            { error: "Failed to create payment order" },
            { status: 500 }
        );
    }
}
