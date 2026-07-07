import { NextResponse } from "next/server";
import { getSessionUser, getUserByExtensionToken, type AuthUser } from "./auth";

export function extensionCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (origin?.startsWith("chrome-extension://") || origin?.startsWith("http://localhost")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function withExtensionCors(request: Request, response: NextResponse) {
  const headers = extensionCorsHeaders(request);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export function extensionOptions(request: Request) {
  return withExtensionCors(request, new NextResponse(null, { status: 204 }));
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export async function requireExtensionAuth(request: Request): Promise<AuthUser | NextResponse> {
  const token = bearerToken(request);
  if (token) {
    const user = await getUserByExtensionToken(token);
    if (user) return user;
  }
  const sessionUser = await getSessionUser();
  if (sessionUser) return sessionUser;
  return withExtensionCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
}
