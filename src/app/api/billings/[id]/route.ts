import { NextResponse } from "next/server";
import { deleteBilling, updateBilling } from "@/lib/queries";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const amount = Number(body.amount);
  if (!body.date || !body.recruiter || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "date, recruiter, and a positive amount are required" },
      { status: 400 }
    );
  }
  const billing = await updateBilling(id, {
    date: body.date,
    recruiter: body.recruiter,
    amount,
    company: body.company,
    candidate: body.candidate,
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
