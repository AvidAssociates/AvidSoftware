import { NextResponse } from "next/server";
import { extensionOptions, requireExtensionAuth, withExtensionCors } from "@/lib/extension-api";

export async function OPTIONS(request: Request) {
  return extensionOptions(request);
}

export async function GET(request: Request) {
  const auth = await requireExtensionAuth(request);
  if (auth instanceof NextResponse) return auth;
  return withExtensionCors(request, NextResponse.json({ user: auth }));
}
