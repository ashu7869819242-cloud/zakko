/**
 * Demand Plan Service — Client-side API wrappers for demand plan operations.
 * Follows the same pattern as autoOrderService.ts.
 */

export interface DemandPlanResponse {
    success: boolean;
    plans?: any[];
    plan?: any;
    error?: string;
}

export async function getDemandPlans(token: string): Promise<DemandPlanResponse> {
    const res = await fetch("/api/demand-plans", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createDemandPlan(
    token: string,
    data: { itemId: string; quantity: number; days: string[] }
): Promise<DemandPlanResponse> {
    const res = await fetch("/api/demand-plans", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateDemandPlan(
    token: string,
    id: string,
    data: { quantity?: number; days?: string[]; isActive?: boolean }
): Promise<DemandPlanResponse> {
    const res = await fetch(`/api/demand-plans?id=${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteDemandPlan(token: string, id: string): Promise<DemandPlanResponse> {
    const res = await fetch(`/api/demand-plans?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
