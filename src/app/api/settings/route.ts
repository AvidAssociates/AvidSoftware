import { NextResponse } from "next/server";
import { getAnnualGoal, setAnnualGoal } from "@/lib/queries";

export async function GET() {
  return NextResponse.json({ annualGoal: getAnnualGoal() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const value = Number(body.annualGoal);
  if (!value || value <= 0) {
    return NextResponse.json(
      { error: "annualGoal must be a positive number" },
      { status: 400 }
    );
  }
  setAnnualGoal(value);
  return NextResponse.json({ annualGoal: value });
}
