import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(getLeaderboard());
}
