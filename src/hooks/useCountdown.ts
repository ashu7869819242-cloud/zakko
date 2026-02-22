/**
 * useCountdown — Reusable countdown hook that ticks every second.
 *
 * Handles: page reload (recalculates from persisted readyAt),
 * tab-inactive catch-up, already-expired timers.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface CountdownResult {
    /** Total remaining seconds (0 when expired) */
    totalSeconds: number;
    /** Display minutes */
    minutes: number;
    /** Display seconds */
    seconds: number;
    /** True when countdown has reached zero */
    isExpired: boolean;
    /** Formatted string "MM:SS" */
    formatted: string;
}

function calcRemaining(readyAt: string | undefined): number {
    if (!readyAt) return 0;
    const diff = new Date(readyAt).getTime() - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

export function useCountdown(readyAt: string | undefined): CountdownResult {
    const [totalSeconds, setTotalSeconds] = useState(() => calcRemaining(readyAt));

    // Recalculate when readyAt changes (e.g. admin updates prep time)
    useEffect(() => {
        setTotalSeconds(calcRemaining(readyAt));
    }, [readyAt]);

    // Tick every second
    useEffect(() => {
        if (!readyAt) return;

        const remaining = calcRemaining(readyAt);
        if (remaining <= 0) {
            setTotalSeconds(0);
            return;
        }

        const interval = setInterval(() => {
            const r = calcRemaining(readyAt);
            setTotalSeconds(r);
            if (r <= 0) clearInterval(interval);
        }, 1000);

        return () => clearInterval(interval);
    }, [readyAt]);

    // Catch up when tab regains focus (handles inactive-tab drift)
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === "visible" && readyAt) {
            setTotalSeconds(calcRemaining(readyAt));
        }
    }, [readyAt]);

    useEffect(() => {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [handleVisibilityChange]);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return {
        totalSeconds,
        minutes,
        seconds,
        isExpired: totalSeconds <= 0 && !!readyAt,
        formatted,
    };
}
