import { NextResponse } from "next/server";
import { createBilling, listBillings } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await listBillings());
}

export async function POST(request: Request) {
  const body = await request.json();
  const amount = Number(body.amount);
  if (!body.id || !body.date || !body.recruiter || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "id, date, recruiter, and a positive amount are required" },
      { status: 400 }
    );
  }
  const billing = await createBilling({
    id: body.id,
    date: body.date,
    recruiter: body.recruiter,
    amount,
    company: body.company,
    candidate: body.candidate,
    notes: body.notes,
    addedBy: body.addedBy,
  });
  return NextResponse.json(billing, { status: 201 });
}
