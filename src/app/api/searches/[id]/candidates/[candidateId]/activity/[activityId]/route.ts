import { NextResponse } from "next/server";
import { deleteCandidateActivityEntry, updateCandidateActivityDate } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string; candidateId: string; activityId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { candidateId, activityId } = await params;
  const body = await request.json();
  if (!body.date) return NextResponse.json({ error: "date is required" }, { status: 400 });
  const candidate = await updateCandidateActivityDate(candidateId, activityId, body.date);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(candidate);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { candidateId, activityId } = await params;
  const candidate = await deleteCandidateActivityEntry(candidateId, activityId);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(candidate);
}
