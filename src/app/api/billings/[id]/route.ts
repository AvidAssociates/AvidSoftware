import { NextResponse } from "next/server";
import { deleteBilling } from "@/lib/queries";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteBilling(Number(id));
  return NextResponse.json({ ok: true });
}
