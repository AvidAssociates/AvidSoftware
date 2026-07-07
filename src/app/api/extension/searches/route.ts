import { NextResponse } from "next/server";
import { listSearches } from "@/lib/queries";
import { extensionOptions, requireExtensionAuth, withExtensionCors } from "@/lib/extension-api";

export async function OPTIONS(request: Request) {
  return extensionOptions(request);
}

export async function GET(request: Request) {
  const auth = await requireExtensionAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  let searches = await listSearches();
  if (q) {
    searches = searches.filter(
      (s) =>
        s.client.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q) ||
        `${s.client} ${s.role ?? ""}`.toLowerCase().includes(q)
    );
  }

  const summary = searches.map((s) => ({
    id: s.id,
    client: s.client,
    role: s.role,
    stage: s.stage,
    team: s.team,
    candidateCount: s.candidates?.length ?? 0,
  }));

  return withExtensionCors(request, NextResponse.json(summary));
}
