import { NextResponse } from "next/server";
import { updateBillingCollectionLogDate } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id, logId } = await params;
  const body = await request.json();
  if (!body.date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const billing = await updateBillingCollectionLogDate(id, logId, body.date);
  if (!billing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(billing);
}
