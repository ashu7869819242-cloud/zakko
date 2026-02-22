/**
 * Admin Service — Client-side API wrappers for admin operations.
 */

import type { CanteenConfig } from "@/types";

function getAdminHeaders(contentType = true): HeadersInit {
    const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
    };
    if (contentType) headers["Content-Type"] = "application/json";
    return headers;
}

export async function getStats(): Promise<Record<string, unknown>> {
    const res = await fetch("/api/admin/stats", { headers: getAdminHeaders(false) });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
}

export async function updateOrder(
    orderId: string,
    data: { status?: string; prepTime?: number }
): Promise<{ success: boolean }> {
    const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({ orderId, ...data }),
    });
    return res.json();
}

export async function addMenuItem(data: Record<string, unknown>): Promise<{ id: string; success: boolean }> {
    const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateMenuItem(data: Record<string, unknown>): Promise<{ success: boolean }> {
    const res = await fetch("/api/admin/menu", {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteMenuItem(id: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/admin/menu", {
        method: "DELETE",
        headers: getAdminHeaders(),
        body: JSON.stringify({ id }),
    });
    return res.json();
}

export async function getCanteenConfig(): Promise<CanteenConfig> {
    const res = await fetch("/api/admin/settings", { headers: getAdminHeaders(false) });
    if (!res.ok) throw new Error("Failed to fetch canteen config");
    return res.json();
}

export async function updateCanteenConfig(data: Partial<CanteenConfig>): Promise<{ success: boolean }> {
    const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
}
