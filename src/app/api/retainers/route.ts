import { NextResponse } from "next/server";
import { createRetainer, listRetainers } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(listRetainers());
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
  const retainer = createRetainer({
    date: body.date,
    recruiter_id: Number(body.recruiter_id),
    amount,
    company: body.company,
    notes: body.notes,
  });
  return NextResponse.json(retainer, { status: 201 });
}
