import { NextResponse } from "next/server";
import { deleteBilling, updateBilling } from "@/lib/queries";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const amount = Number(body.amount);
  const team = Array.isArray(body.team) ? body.team : [];
  if (!body.date || !team.length || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "date, at least one team member, and a positive amount are required" },
      { status: 400 }
    );
  }
  const billing = await updateBilling(id, {
    date: body.date,
    team,
    amount,
    company: body.company,
    candidate: body.candidate,
    role: body.role,
    notes: body.notes,
  });
  return NextResponse.json(billing);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteBilling(id);
  return NextResponse.json({ ok: true });
}
