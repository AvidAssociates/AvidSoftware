import { NextResponse } from "next/server";
import { addRosterMember, listRoster } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listRoster());
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const member = await addRosterMember(name);
  return NextResponse.json(member, { status: 201 });
}
