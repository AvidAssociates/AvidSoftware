import { NextResponse } from "next/server";
import { addRosterMember, listRoster } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await listRoster());
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const member = await addRosterMember(name);
  return NextResponse.json(member, { status: 201 });
}
