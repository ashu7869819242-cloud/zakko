/**
 * /api/demand-plans — User Demand Plan CRUD
 *
 * GET    ?userId=xxx   — List user's demand plans
 * POST                 — Create a new demand plan
 * PATCH  ?id=xxx       — Update an existing plan (quantity, days, isActive)
 * DELETE ?id=xxx       — Delete a plan
 *
 * All endpoints require Firebase ID token via Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/user-auth";

const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ─── GET ────────────────────────────────────────
export async function GET(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const snap = await adminDb
            .collection("userDemandPlans")
            .where("userId", "==", uid)
            .orderBy("createdAt", "desc")
            .get();

        const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return NextResponse.json({ success: true, plans });
    } catch (err) {
        console.error("[DemandPlans] GET error:", err);
        return NextResponse.json({ error: "Failed to fetch demand plans" }, { status: 500 });
    }
}

// ─── POST ───────────────────────────────────────
export async function POST(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { itemId, quantity, days } = body;

        // Validate
        if (!itemId || !quantity || !days?.length) {
            return NextResponse.json({ error: "itemId, quantity, and days are required" }, { status: 400 });
        }
        if (typeof quantity !== "number" || quantity < 1 || quantity > 100) {
            return NextResponse.json({ error: "Quantity must be 1–100" }, { status: 400 });
        }
        const invalidDays = days.filter((d: string) => !VALID_DAYS.includes(d));
        if (invalidDays.length > 0) {
            return NextResponse.json({ error: `Invalid days: ${invalidDays.join(", ")}` }, { status: 400 });
        }

        // Fetch item details to store name
        const itemDoc = await adminDb.collection("menuItems").doc(itemId).get();
        if (!itemDoc.exists) {
            return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
        }
        const itemName = itemDoc.data()?.name ?? "Unknown Item";

        // Fetch user name
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userName = userDoc.data()?.name ?? "Unknown User";

        const now = new Date().toISOString();
        const planData = {
            userId: uid,
            userName,
            itemId,
            itemName,
            quantity,
            days,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        const ref = await adminDb.collection("userDemandPlans").add(planData);
        console.log(`[DemandPlans] Created plan ${ref.id} for user ${uid}`);

        return NextResponse.json({ success: true, plan: { id: ref.id, ...planData } });
    } catch (err) {
        console.error("[DemandPlans] POST error:", err);
        return NextResponse.json({ error: "Failed to create demand plan" }, { status: 500 });
    }
}

// ─── PATCH ──────────────────────────────────────
export async function PATCH(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Plan id required" }, { status: 400 });

    try {
        const docRef = adminDb.collection("userDemandPlans").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }
        if (docSnap.data()?.userId !== uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

        if (body.quantity !== undefined) {
            if (typeof body.quantity !== "number" || body.quantity < 1 || body.quantity > 100) {
                return NextResponse.json({ error: "Quantity must be 1–100" }, { status: 400 });
            }
            updates.quantity = body.quantity;
        }
        if (body.days !== undefined) {
            const invalidDays = body.days.filter((d: string) => !VALID_DAYS.includes(d));
            if (invalidDays.length > 0) {
                return NextResponse.json({ error: `Invalid days: ${invalidDays.join(", ")}` }, { status: 400 });
            }
            updates.days = body.days;
        }
        if (body.isActive !== undefined) {
            updates.isActive = Boolean(body.isActive);
        }

        await docRef.update(updates);
        console.log(`[DemandPlans] Updated plan ${id}`);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[DemandPlans] PATCH error:", err);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}

// ─── DELETE ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Plan id required" }, { status: 400 });

    try {
        const docRef = adminDb.collection("userDemandPlans").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }
        if (docSnap.data()?.userId !== uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await docRef.delete();
        console.log(`[DemandPlans] Deleted plan ${id}`);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[DemandPlans] DELETE error:", err);
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}
