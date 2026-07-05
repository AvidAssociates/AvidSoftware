import { NextResponse } from "next/server";
import { logMeeting } from "@/lib/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  if (!body.type || !body.round || !body.date) {
    return NextResponse.json(
      { error: "type, round, and date are required" },
      { status: 400 }
    );
  }
  const entry = await logMeeting(id, body.type, Number(body.round), body.date);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}
