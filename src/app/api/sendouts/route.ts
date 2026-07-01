import { NextResponse } from "next/server";
import { createSendout, listSendouts } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await listSendouts());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.date || !body.candidate || !body.company || !body.recruiter_id) {
    return NextResponse.json(
      { error: "date, candidate, company, and recruiter_id are required" },
      { status: 400 }
    );
  }
  const sendout = await createSendout({
    date: body.date,
    candidate: body.candidate,
    company: body.company,
    role: body.role,
    type: body.type,
    recruiter_id: Number(body.recruiter_id),
    am_recruiter_id: body.am_recruiter_id ? Number(body.am_recruiter_id) : null,
    notes: body.notes,
  });
  return NextResponse.json(sendout, { status: 201 });
}
