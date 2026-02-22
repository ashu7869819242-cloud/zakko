/**
 * Order Service — Client-side API wrappers for order operations.
 */

import type { OrderItem } from "@/types";

export async function createOrder(
    token: string,
    data: {
        userId: string;
        items: OrderItem[];
        total: number;
        userName: string;
        userEmail: string;
    }
): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function getOrders(
    token: string,
    userId: string
): Promise<{ orders: Array<Record<string, unknown>> }> {
    const res = await fetch(`/api/orders?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch orders");
    return res.json();
}
