/**
 * Menu Service — Client-side API wrappers for menu operations.
 */

import type { MenuItem } from "@/types";

export async function getMenuItems(): Promise<{ items: MenuItem[] }> {
    const res = await fetch("/api/menu");
    if (!res.ok) throw new Error("Failed to fetch menu");
    return res.json();
}
