import { NextResponse } from "next/server";
import { advanceBillingCollection } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";
import { BillingCollectionStage } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  const stage = body.stage as BillingCollectionStage;
  if (stage !== "invoiced" && stage !== "collected") {
    return NextResponse.json({ error: "stage must be invoiced or collected" }, { status: 400 });
  }
  const billing = await advanceBillingCollection(id, stage, body.stageDate);
  if (!billing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(billing);
}
