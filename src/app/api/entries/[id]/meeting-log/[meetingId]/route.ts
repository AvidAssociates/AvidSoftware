import { NextResponse } from "next/server";
import { deleteMeetingLogEntry, updateMeetingLogDate } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id, meetingId } = await params;
  const body = await request.json();
  const date = typeof body.date === "string" ? body.date.trim() : "";
  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const entry = await updateMeetingLogDate(id, meetingId, date);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id, meetingId } = await params;
  const entry = await deleteMeetingLogEntry(id, meetingId);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}
