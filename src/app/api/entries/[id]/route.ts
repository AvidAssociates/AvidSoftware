import { NextResponse } from "next/server";
import { deleteEntry, updateEntry } from "@/lib/queries";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const entry = await updateEntry(id, {
    date: body.date,
    candidate: body.candidate,
    company: body.company,
    role: body.role,
    interviewType: body.interviewType || "Phone",
    round: Number(body.round) || 1,
    team: Array.isArray(body.team) ? body.team : [],
    stage: body.stage || "sent",
    declined: Boolean(body.declined),
    declinedReason: body.declinedReason,
    notes: body.notes,
    firstTime: body.firstTime === undefined ? true : Boolean(body.firstTime),
    stageDate: body.stageDate,
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteEntry(id);
  return NextResponse.json({ ok: true });
}
