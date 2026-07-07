import { NextResponse } from "next/server";
import { createSearchCandidate, getSearch } from "@/lib/queries";
import { uid } from "@/lib/ui";
import { extensionOptions, requireExtensionAuth, withExtensionCors } from "@/lib/extension-api";
import type { CandidateStage } from "@/lib/types";

const STAGES: CandidateStage[] = ["presented", "interview", "offer", "placed"];

export async function OPTIONS(request: Request) {
  return extensionOptions(request);
}

export async function POST(request: Request) {
  const auth = await requireExtensionAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const searchId = typeof body.searchId === "string" ? body.searchId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const stage = typeof body.stage === "string" ? body.stage : "presented";
  const profileImageUrl = typeof body.profileImageUrl === "string" ? body.profileImageUrl : null;
  const linkedinUrl = typeof body.linkedinUrl === "string" ? body.linkedinUrl : null;

  if (!searchId || !name) {
    return withExtensionCors(request, NextResponse.json({ error: "searchId and name are required" }, { status: 400 }));
  }
  if (!STAGES.includes(stage as CandidateStage)) {
    return withExtensionCors(request, NextResponse.json({ error: "Invalid stage" }, { status: 400 }));
  }

  const search = await getSearch(searchId);
  if (!search) {
    return withExtensionCors(request, NextResponse.json({ error: "Search not found" }, { status: 404 }));
  }

  const candidate = await createSearchCandidate({
    id: typeof body.id === "string" ? body.id : uid(),
    searchId,
    name,
    stage: stage as CandidateStage,
    profileImageUrl,
    linkedinUrl,
    addedBy: auth.displayName,
    notes: linkedinUrl ? `LinkedIn: ${linkedinUrl}` : null,
  });

  return withExtensionCors(
    request,
    NextResponse.json({
      candidate,
      search: { id: search.id, client: search.client, role: search.role },
    }, { status: 201 })
  );
}
