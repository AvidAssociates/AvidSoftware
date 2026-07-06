import { NextResponse } from "next/server";
import { deleteBilling, updateBilling } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
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
    salary: body.salary === undefined || body.salary === null ? null : Number(body.salary),
    feePercent: body.feePercent === undefined || body.feePercent === null ? null : Number(body.feePercent),
  });
  return NextResponse.json(billing);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await deleteBilling(id);
  return NextResponse.json({ ok: true });
}
