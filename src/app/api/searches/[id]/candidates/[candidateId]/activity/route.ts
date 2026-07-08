import { NextResponse } from "next/server";
import { logCandidateActivity } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string; candidateId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { candidateId } = await params;
  const body = await request.json();
  if (!body.type || !body.round || !body.date) {
    return NextResponse.json({ error: "type, round, and date are required" }, { status: 400 });
  }
  const candidate = await logCandidateActivity(candidateId, body.type, Number(body.round), body.date);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(candidate);
}
