import { NextResponse } from "next/server";
import { createSearch, listSearches } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listSearches());
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  if (!body.id || !body.date || !body.client) {
    return NextResponse.json({ error: "id, date, and client are required" }, { status: 400 });
  }
  const search = await createSearch({
    id: body.id,
    date: body.date,
    client: body.client,
    role: body.role,
    team: Array.isArray(body.team) ? body.team : [],
    stage: body.stage,
    retainerAmount: body.retainerAmount ?? null,
    notes: body.notes,
    addedBy: body.addedBy,
  });
  return NextResponse.json(search, { status: 201 });
}
