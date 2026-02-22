/**
 * useWallet — Real-time wallet transactions subscription via onSnapshot.
 */

"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WalletTransaction } from "@/types";

export function useWallet(userId: string | undefined) {
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setTransactions([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "walletTransactions"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const txnList = snapshot.docs.map(
                    (doc) => ({ id: doc.id, ...doc.data() }) as WalletTransaction
                );
                setTransactions(txnList);
                setLoading(false);
            },
            (error) => {
                console.error("Wallet transactions listener error:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return { transactions, loading };
}
