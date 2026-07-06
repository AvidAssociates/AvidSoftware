import { NextResponse } from "next/server";
import { deleteSearch, getSearch, updateSearch } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const search = await getSearch(id);
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(search);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  if (!body.date || !body.client || !body.stage) {
    return NextResponse.json({ error: "date, client, and stage are required" }, { status: 400 });
  }
  const search = await updateSearch(id, {
    date: body.date,
    client: body.client,
    role: body.role,
    team: Array.isArray(body.team) ? body.team : [],
    stage: body.stage,
    retainerAmount: body.retainerAmount ?? null,
    notes: body.notes,
    stageDate: body.stageDate,
  });
  return NextResponse.json(search);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await deleteSearch(id);
  return NextResponse.json({ ok: true });
}
