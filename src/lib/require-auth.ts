import { NextResponse } from "next/server";
import { getSessionUser, type AuthUser } from "./auth";

export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}
