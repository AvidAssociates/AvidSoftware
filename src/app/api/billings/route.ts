import { NextResponse } from "next/server";
import { createBilling, listBillings } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(listBillings());
}

export async function POST(request: Request) {
  const body = await request.json();
  const amount = Number(body.amount);
  if (!body.date || !body.recruiter_id || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "date, recruiter_id, and a positive amount are required" },
      { status: 400 }
    );
  }
  const billing = createBilling({
    date: body.date,
    recruiter_id: Number(body.recruiter_id),
    amount,
    category: body.category,
    personal: body.personal !== false,
    candidate: body.candidate,
    company: body.company,
    notes: body.notes,
  });
  return NextResponse.json(billing, { status: 201 });
}
