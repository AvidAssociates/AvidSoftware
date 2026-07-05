import { NextResponse } from "next/server";
import { getProductionGoals, setProductionGoals } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  return NextResponse.json(await getProductionGoals(year));
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const year = Number(body.year);
  if (!year) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }
  const yearlyGoal = body.yearlyGoal === null || body.yearlyGoal === undefined ? null : Number(body.yearlyGoal);
  const monthlyGoal = body.monthlyGoal === null || body.monthlyGoal === undefined ? null : Number(body.monthlyGoal);
  return NextResponse.json(await setProductionGoals(year, yearlyGoal, monthlyGoal));
}
