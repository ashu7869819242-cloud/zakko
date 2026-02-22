/**
 * Payment Service — Client-side API wrappers for Razorpay operations.
 */

export async function createRazorpayOrder(
    token: string,
    amount: number
): Promise<{ orderId: string; amount: number; currency: string }> {
    const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create order");
    }
    return res.json();
}

export async function verifyPayment(
    token: string,
    data: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        amount: number;
    }
): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}
