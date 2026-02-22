/**
 * useCanteenStatus — Real-time canteen config subscription.
 * Returns the current config, computed isCurrentlyOpen, and minutesUntilClose.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CanteenConfig } from "@/types";

const DEFAULT_CONFIG: CanteenConfig = {
    isOpen: true,
    startTime: "09:00",
    endTime: "17:00",
};

export function useCanteenStatus() {
    const [config, setConfig] = useState<CanteenConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [currentMinutes, setCurrentMinutes] = useState(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    });

    // Real-time config listener
    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, "settings", "canteenConfig"),
            (docSnap) => {
                if (docSnap.exists()) {
                    setConfig(docSnap.data() as CanteenConfig);
                }
                setLoading(false);
            },
            (error) => {
                console.error("Canteen config listener error:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const { isCurrentlyOpen, minutesUntilClose } = useMemo(() => {
        if (!config.isOpen) return { isCurrentlyOpen: false, minutesUntilClose: 0 };

        const [startH, startM] = config.startTime.split(":").map(Number);
        const [endH, endM] = config.endTime.split(":").map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        const withinHours = currentMinutes >= startMin && currentMinutes <= endMin;
        const remaining = withinHours ? endMin - currentMinutes : 0;

        return { isCurrentlyOpen: withinHours, minutesUntilClose: remaining };
    }, [config, currentMinutes]);

    return { config, isCurrentlyOpen, minutesUntilClose, loading };
}
