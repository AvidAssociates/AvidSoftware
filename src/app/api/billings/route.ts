import { NextResponse } from "next/server";
import { createBilling, listBillings } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listBillings());
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const amount = Number(body.amount);
  const team = Array.isArray(body.team) ? body.team : [];
  if (!body.id || !body.date || !team.length || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "id, date, at least one team member, and a positive amount are required" },
      { status: 400 }
    );
  }
  const billing = await createBilling({
    id: body.id,
    date: body.date,
    team,
    amount,
    company: body.company,
    candidate: body.candidate,
    role: body.role,
    notes: body.notes,
    addedBy: body.addedBy,
  });
  return NextResponse.json(billing, { status: 201 });
}
