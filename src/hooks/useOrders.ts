/**
 * useOrders — Real-time user orders subscription via onSnapshot.
 */

"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/types";

export function useOrders(userId: string | undefined) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setOrders([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "orders"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const orderList = snapshot.docs.map(
                    (doc) => ({ id: doc.id, ...doc.data() }) as Order
                );
                setOrders(orderList);
                setLoading(false);
            },
            (error) => {
                console.error("Orders listener error:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return { orders, loading };
}
