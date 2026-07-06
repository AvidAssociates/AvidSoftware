import { NextResponse } from "next/server";
import { deleteSearchCandidate, updateSearchCandidate } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string; candidateId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { candidateId } = await params;
  const body = await request.json();
  if (!body.name || !body.stage) {
    return NextResponse.json({ error: "name and stage are required" }, { status: 400 });
  }
  const candidate = await updateSearchCandidate(candidateId, {
    name: body.name,
    stage: body.stage,
    notes: body.notes,
    stageDate: body.stageDate,
  });
  return NextResponse.json(candidate);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { candidateId } = await params;
  await deleteSearchCandidate(candidateId);
  return NextResponse.json({ ok: true });
}
