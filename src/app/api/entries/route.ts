import { NextResponse } from "next/server";
import { createEntry, listEntries } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await listEntries());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.id || !body.date || !body.candidate || !body.company) {
    return NextResponse.json(
      { error: "id, date, candidate, and company are required" },
      { status: 400 }
    );
  }
  const entry = await createEntry({
    id: body.id,
    date: body.date,
    candidate: body.candidate,
    company: body.company,
    role: body.role,
    interviewType: body.interviewType || "Phone",
    round: Number(body.round) || 1,
    team: Array.isArray(body.team) ? body.team : [],
    stage: body.stage || "sent",
    declined: Boolean(body.declined),
    notes: body.notes,
    addedBy: body.addedBy,
  });
  return NextResponse.json(entry, { status: 201 });
}
