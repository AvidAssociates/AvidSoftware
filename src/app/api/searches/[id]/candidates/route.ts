import { NextResponse } from "next/server";
import { createSearchCandidate } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id: searchId } = await params;
  const body = await request.json();
  if (!body.id || !body.name) {
    return NextResponse.json({ error: "id and name are required" }, { status: 400 });
  }
  const candidate = await createSearchCandidate({
    id: body.id,
    searchId,
    name: body.name,
    stage: body.stage,
    notes: body.notes,
    addedBy: body.addedBy,
    stageDate: body.stageDate,
  });
  return NextResponse.json(candidate, { status: 201 });
}
