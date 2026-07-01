import { NextResponse } from "next/server";
import { deleteSendout } from "@/lib/queries";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteSendout(Number(id));
  return NextResponse.json({ ok: true });
}
