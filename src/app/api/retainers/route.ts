import { NextResponse } from "next/server";
import { listRetainers, setRetainer } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listRetainers());
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const recruiter = String(body.recruiter || "").trim();
  if (!recruiter) {
    return NextResponse.json({ error: "recruiter is required" }, { status: 400 });
  }
  const client = body.client === null || body.client === undefined ? null : String(body.client);
  const amount = body.amount === null || body.amount === undefined || body.amount === "" ? null : Number(body.amount);
  const retainer = await setRetainer(recruiter, client, amount);
  return NextResponse.json(retainer);
}
