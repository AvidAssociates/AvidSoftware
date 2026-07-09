import { NextResponse } from "next/server";
import { logMeeting } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  if (!body.type || !body.round || !body.date) {
    return NextResponse.json(
      { error: "type, round, and date are required" },
      { status: 400 }
    );
  }
  const entry = await logMeeting(id, body.type, Number(body.round), body.date, body.id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}
