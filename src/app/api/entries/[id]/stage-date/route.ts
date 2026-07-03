import { NextResponse } from "next/server";
import { setStageEventDate } from "@/lib/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  if (!body.stage || !body.date) {
    return NextResponse.json(
      { error: "stage and date are required" },
      { status: 400 }
    );
  }
  const entry = await setStageEventDate(id, body.stage, body.date);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}
