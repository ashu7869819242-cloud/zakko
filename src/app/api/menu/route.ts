/**
 * Menu API — Public menu access + Admin-only seed endpoint
 * 
 * SECURITY CHANGES:
 * - GET: Remains public (no auth required — menu is public data)
 * - POST (seed): Now requires admin JWT authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// GET /api/menu — Fetch all menu items (public)
export async function GET() {
    try {
        const snapshot = await adminDb.collection("menuItems").get();
        const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error fetching menu:", error);
        return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
    }
}

// POST /api/menu — Seed menu items (ADMIN ONLY)
export async function POST(req: NextRequest) {
    // SECURITY: Require admin JWT to seed menu items
    if (!verifyAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { items } = await req.json();
        const batch = adminDb.batch();
        for (const item of items) {
            const ref = adminDb.collection("menuItems").doc();
            batch.set(ref, {
                ...item,
                createdAt: new Date().toISOString(),
            });
        }
        await batch.commit();
        return NextResponse.json({ success: true, count: items.length });
    } catch (error) {
        console.error("Error seeding menu:", error);
        return NextResponse.json({ error: "Failed to seed menu" }, { status: 500 });
    }
}
