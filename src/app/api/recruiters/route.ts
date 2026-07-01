import { NextResponse } from "next/server";
import { createRecruiter, listRecruiters } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await listRecruiters(false));
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const recruiter = await createRecruiter(name);
  return NextResponse.json(recruiter, { status: 201 });
}
