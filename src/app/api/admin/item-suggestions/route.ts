/**
 * /api/admin/item-suggestions — Admin Item Suggestion Management
 *
 * GET   — Fetch all suggestions with summary stats.
 * PATCH — Update suggestion status (approve/reject). On approval,
 *         creates notification docs for all requestedBy users.
 *
 * Protected by admin JWT.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// ─── GET ────────────────────────────────────────
export async function GET(req: NextRequest) {
    const admin = verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        console.log("[AdminSuggestions] Fetching all suggestions...");

        const snap = await adminDb
            .collection("itemSuggestions")
            .orderBy("createdAt", "desc")
            .get();

        const suggestions = snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                itemName: data.itemName,
                normalizedName: data.normalizedName,
                category: data.category || null,
                description: data.description || null,
                expectedPrice: data.expectedPrice || null,
                totalRequests: data.totalRequests || 0,
                uniqueUsers: data.requestedBy?.length || 0,
                status: data.status || "pending",
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            };
        });

        // Summary stats
        const total = suggestions.length;
        const pending = suggestions.filter((s) => s.status === "pending").length;
        const approved = suggestions.filter((s) => s.status === "approved").length;
        const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

        let mostRequested = "—";
        let mostRequestedCount = 0;
        for (const s of suggestions) {
            if (s.totalRequests > mostRequestedCount) {
                mostRequestedCount = s.totalRequests;
                mostRequested = s.itemName;
            }
        }

        const summary = {
            total,
            pending,
            approved,
            rejected: suggestions.filter((s) => s.status === "rejected").length,
            conversionRate,
            mostRequested,
            mostRequestedCount,
        };

        console.log(`[AdminSuggestions] Found ${total} suggestions, ${pending} pending`);

        return NextResponse.json({ success: true, suggestions, summary });
    } catch (err) {
        console.error("[AdminSuggestions] GET error:", err);
        return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
}

// ─── PATCH ──────────────────────────────────────
export async function PATCH(req: NextRequest) {
    const admin = verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Suggestion id required" }, { status: 400 });

    try {
        const body = await req.json();
        const { status } = body;

        if (!status || !["approved", "rejected"].includes(status)) {
            return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
        }

        const docRef = adminDb.collection("itemSuggestions").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
        }

        const suggestionData = docSnap.data()!;

        await docRef.update({
            status,
            updatedAt: new Date().toISOString(),
        });

        console.log(`[AdminSuggestions] ${status.toUpperCase()} suggestion "${suggestionData.itemName}" (doc: ${id})`);

        // On approval: create notifications for all requestedBy users
        if (status === "approved" && suggestionData.requestedBy?.length > 0) {
            const batch = adminDb.batch();
            const now = new Date().toISOString();

            for (const userId of suggestionData.requestedBy) {
                const notifRef = adminDb.collection("notifications").doc();
                batch.set(notifRef, {
                    userId,
                    type: "suggestion_approved",
                    title: "Item Suggestion Approved! 🎉",
                    message: `"${suggestionData.itemName}" has been approved and may be added to the menu soon.`,
                    read: false,
                    createdAt: now,
                });
            }

            await batch.commit();
            console.log(`[AdminSuggestions] Notified ${suggestionData.requestedBy.length} users about approval`);
        }

        return NextResponse.json({
            success: true,
            suggestion: {
                id,
                itemName: suggestionData.itemName,
                category: suggestionData.category,
                description: suggestionData.description,
                expectedPrice: suggestionData.expectedPrice,
            },
        });
    } catch (err) {
        console.error("[AdminSuggestions] PATCH error:", err);
        return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    }
}
