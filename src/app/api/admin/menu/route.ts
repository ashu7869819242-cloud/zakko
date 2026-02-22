/**
 * Admin Menu API — CRUD for menu items
 * 
 * SECURITY CHANGES:
 * - All handlers now require admin JWT verification via verifyAdmin()
 * - Returns 401 Unauthorized if token is missing or invalid
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// SECURITY: Centralized auth check for all admin menu operations
function requireAdmin(req: NextRequest): NextResponse | null {
    if (!verifyAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}

export async function GET(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const snapshot = await adminDb.collection("menuItems").get();
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ items });
    } catch (error) {
        console.error("Failed to fetch menu items:", error);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const docRef = await adminDb.collection("menuItems").add({
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        return NextResponse.json({ id: docRef.id, success: true });
    } catch (error) {
        console.error("Failed to add menu item:", error);
        return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const { id, ...data } = await req.json();
        if (!id) {
            return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }
        await adminDb.collection("menuItems").doc(id).update({
            ...data,
            updatedAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update menu item:", error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }
        await adminDb.collection("menuItems").doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete menu item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
