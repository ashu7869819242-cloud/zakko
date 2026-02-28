/**
 * /api/admin/feedback — Admin Feedback API
 *
 * GET   — Fetch all userFeedbacks with analytics (avg rating, category breakdown)
 * PATCH — Mark feedback as reviewed
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
        const snap = await adminDb
            .collection("userFeedbacks")
            .orderBy("createdAt", "desc")
            .get();

        const feedbacks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Analytics
        const total = feedbacks.length;
        let ratingSum = 0;
        const categoryCount: Record<string, number> = {};
        const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let reviewed = 0;

        for (const f of feedbacks) {
            const fb = f as unknown as { rating: number; category: string; status: string };
            ratingSum += fb.rating;
            ratingDist[fb.rating] = (ratingDist[fb.rating] || 0) + 1;
            categoryCount[fb.category] = (categoryCount[fb.category] || 0) + 1;
            if (fb.status === "reviewed") reviewed++;
        }

        const avgRating = total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0;

        let topCategory = "—";
        let topCategoryCount = 0;
        for (const [cat, count] of Object.entries(categoryCount)) {
            if (count > topCategoryCount) { topCategoryCount = count; topCategory = cat; }
        }

        const analytics = {
            total,
            avgRating,
            reviewed,
            pending: total - reviewed,
            topCategory,
            topCategoryCount,
            ratingDistribution: ratingDist,
            categoryBreakdown: categoryCount,
        };

        return NextResponse.json({ success: true, feedbacks, analytics });
    } catch (err) {
        console.error("[AdminFeedback] GET error:", err);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

// ─── PATCH ──────────────────────────────────────
export async function PATCH(req: NextRequest) {
    const admin = verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Feedback id required" }, { status: 400 });

    try {
        const docRef = adminDb.collection("userFeedbacks").doc(id);
        const snap = await docRef.get();
        if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

        await docRef.update({
            status: "reviewed",
            reviewedAt: new Date().toISOString(),
        });

        console.log(`[AdminFeedback] Marked feedback ${id} as reviewed`);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[AdminFeedback] PATCH error:", err);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
