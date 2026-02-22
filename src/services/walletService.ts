/**
 * Wallet Service — Client-side API wrappers for wallet operations.
 */

import type { WalletTransaction } from "@/types";

export async function getWallet(
    token: string,
    userId: string
): Promise<{ walletBalance: number; transactions: WalletTransaction[] }> {
    const res = await fetch(`/api/wallet?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch wallet");
    return res.json();
}

export async function transferByCode(
    token: string,
    recipientCode: string,
    amount: number
): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientCode, amount }),
    });
    return res.json();
}
