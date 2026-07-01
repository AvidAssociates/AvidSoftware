import { NextResponse } from "next/server";
import { setRecruiterActive } from "@/lib/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  setRecruiterActive(Number(id), Boolean(body.active));
  return NextResponse.json({ ok: true });
}
