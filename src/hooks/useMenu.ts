/**
 * useMenu — Real-time menu items subscription via onSnapshot.
 */

"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MenuItem } from "@/types";

export function useMenu() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "menuItems"), orderBy("name"));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const menuItems = snapshot.docs.map(
                    (doc) => ({ id: doc.id, ...doc.data() }) as MenuItem
                );
                setItems(menuItems);
                setLoading(false);
            },
            (error) => {
                console.error("Menu listener error:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { items, loading };
}
