/**
 * useOrderNotifications — Fires toast, browser notification, and sound
 * when an order status transitions to "ready".
 *
 * Tracks previously-seen statuses via useRef to avoid duplicate alerts
 * and handles first-load without firing stale notifications.
 */

"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import type { Order } from "@/types";

/** Play the notification sound (best-effort, browsers may block autoplay) */
function playNotificationSound() {
    try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 0.7;
        audio.play().catch(() => {
            // Browser blocked autoplay — silent fail
        });
    } catch {
        // Audio not supported
    }
}

/** Request permission and send a browser notification */
function sendBrowserNotification(orderId: string) {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const show = () => {
        new Notification("🎉 Order Ready!", {
            body: `Your order #${orderId} is ready for pickup!`,
            icon: "/favicon.ico",
        });
    };

    if (Notification.permission === "granted") {
        show();
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
            if (perm === "granted") show();
        });
    }
}

export function useOrderNotifications(orders: Order[]) {
    // Map of orderId → last seen status (used to detect transitions)
    const prevStatusMap = useRef<Record<string, string>>({});
    const initialLoadDone = useRef(false);

    useEffect(() => {
        // On the very first snapshot, record all statuses without firing alerts
        if (!initialLoadDone.current) {
            const map: Record<string, string> = {};
            for (const o of orders) {
                map[o.id] = o.status;
            }
            prevStatusMap.current = map;
            initialLoadDone.current = true;
            return;
        }

        for (const order of orders) {
            const prev = prevStatusMap.current[order.id];

            // Fire notification only when status *transitions* to "ready"
            if (order.status === "ready" && prev && prev !== "ready") {
                toast("Your order is ready! 🎉", {
                    icon: "✅",
                    duration: 6000,
                    style: {
                        background: "#065f46",
                        color: "#fff",
                        fontWeight: 600,
                    },
                });
                playNotificationSound();
                sendBrowserNotification(order.orderId);
            }

            // Update tracked status
            prevStatusMap.current[order.id] = order.status;
        }
    }, [orders]);
}
