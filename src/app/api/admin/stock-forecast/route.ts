/**
 * /api/admin/stock-forecast — Admin Stock Forecast API
 *
 * GET — Returns aggregated demand data from all active userDemandPlans.
 * Protected by admin JWT verification.
 *
 * Response shape:
 * {
 *   demandByDay: { Monday: { itemName: totalQty, ... }, ... },
 *   weeklyTotals: { itemName: totalQty, ... },
 *   stockComparison: [{ itemId, itemName, currentStock, weeklyDemand, dailyDemand: {...}, shortageRisk }],
 *   summary: { totalActiveUsers, highestDemandItem, mostDemandingDay, itemsAtRisk }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export async function GET(req: NextRequest) {
    const admin = verifyAdmin(req);
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[StockForecast] Starting demand aggregation...");

        // ── 1. Fetch all ACTIVE demand plans in a single read ──
        const plansSnap = await adminDb
            .collection("userDemandPlans")
            .where("isActive", "==", true)
            .get();

        console.log(`[StockForecast] Found ${plansSnap.size} active demand plans`);

        // ── 2. Single-pass aggregation ──
        const demandByDay: Record<string, Record<string, number>> = {};
        const weeklyTotals: Record<string, number> = {};
        const activeUserIds = new Set<string>();
        const itemIdMap: Record<string, string> = {}; // itemName -> itemId

        for (const day of ALL_DAYS) {
            demandByDay[day] = {};
        }

        plansSnap.forEach((doc) => {
            const plan = doc.data();
            activeUserIds.add(plan.userId);

            const itemName: string = plan.itemName;
            const itemId: string = plan.itemId;
            const quantity: number = plan.quantity || 0;
            const days: string[] = plan.days || [];

            itemIdMap[itemName] = itemId;

            for (const day of days) {
                if (demandByDay[day]) {
                    demandByDay[day][itemName] = (demandByDay[day][itemName] || 0) + quantity;
                }
            }

            weeklyTotals[itemName] = (weeklyTotals[itemName] || 0) + quantity * days.length;
        });

        // ── 3. Fetch current stock from menuItems (batched) ──
        const uniqueItemIds = [...new Set(Object.values(itemIdMap))];
        const stockMap: Record<string, number> = {};

        // Firestore getAll supports up to 500 docs at a time
        const BATCH_SIZE = 100;
        for (let i = 0; i < uniqueItemIds.length; i += BATCH_SIZE) {
            const batch = uniqueItemIds.slice(i, i + BATCH_SIZE);
            const refs = batch.map((id) => adminDb.collection("menuItems").doc(id));
            const docs = await adminDb.getAll(...refs);
            docs.forEach((d) => {
                if (d.exists) {
                    stockMap[d.id] = d.data()?.quantity ?? 0;
                }
            });
        }

        // ── 4. Build stock comparison ──
        const stockComparison = Object.entries(itemIdMap).map(([itemName, itemId]) => {
            const currentStock = stockMap[itemId] ?? 0;
            const totalWeeklyDemand = weeklyTotals[itemName] || 0;

            // Daily demand for this item
            const dailyDemand: Record<string, number> = {};
            for (const day of ALL_DAYS) {
                const val = demandByDay[day][itemName];
                if (val) dailyDemand[day] = val;
            }

            // Max single-day demand determines shortage risk
            const maxDailyDemand = Math.max(0, ...Object.values(dailyDemand));
            const shortageRisk = maxDailyDemand > currentStock;
            const suggestedMinStock = Math.ceil(maxDailyDemand * 1.2); // 20% buffer

            return {
                itemId,
                itemName,
                currentStock,
                weeklyDemand: totalWeeklyDemand,
                maxDailyDemand,
                suggestedMinStock,
                shortageRisk,
                dailyDemand,
            };
        });

        // ── 5. Summary cards ──
        let highestDemandItem = "—";
        let highestDemandQty = 0;
        for (const [item, total] of Object.entries(weeklyTotals)) {
            if (total > highestDemandQty) {
                highestDemandQty = total;
                highestDemandItem = item;
            }
        }

        let mostDemandingDay = "—";
        let mostDemandingDayQty = 0;
        for (const day of ALL_DAYS) {
            const dayTotal = Object.values(demandByDay[day]).reduce((s, v) => s + v, 0);
            if (dayTotal > mostDemandingDayQty) {
                mostDemandingDayQty = dayTotal;
                mostDemandingDay = day;
            }
        }

        const itemsAtRisk = stockComparison.filter((s) => s.shortageRisk).length;

        const summary = {
            totalActiveUsers: activeUserIds.size,
            highestDemandItem: highestDemandItem || "—",
            highestDemandQty,
            mostDemandingDay: mostDemandingDay || "—",
            mostDemandingDayQty,
            itemsAtRisk,
        };

        // Day chart data
        const dayChartData = ALL_DAYS.map((day) => ({
            day,
            total: Object.values(demandByDay[day]).reduce((s, v) => s + v, 0),
        }));

        console.log("[StockForecast] Aggregation complete:", JSON.stringify(summary));

        return NextResponse.json({
            success: true,
            demandByDay,
            weeklyTotals,
            stockComparison,
            summary,
            dayChartData,
        });
    } catch (err) {
        console.error("[StockForecast] Aggregation error:", err);
        return NextResponse.json({ error: "Failed to aggregate demand data" }, { status: 500 });
    }
}
