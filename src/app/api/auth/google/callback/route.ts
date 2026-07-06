import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, getUserByEmail, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import {
  GOOGLE_OAUTH_FROM_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  isGoogleAuthConfigured,
  oauthCookieOptions,
  safeRedirectPath,
  verifyGoogleCallback,
} from "@/lib/google-oauth";

function loginError(request: Request, code: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { ...oauthCookieOptions(), maxAge: 0 });
  res.cookies.set(GOOGLE_OAUTH_FROM_COOKIE, "", { ...oauthCookieOptions(), maxAge: 0 });
  return res;
}

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return loginError(request, "google_misconfigured");
  }

  const { searchParams, origin } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) return loginError(request, error === "access_denied" ? "google_denied" : "google_failed");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) return loginError(request, "google_failed");

  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const from = safeRedirectPath(jar.get(GOOGLE_OAUTH_FROM_COOKIE)?.value);
  if (!expectedState || state !== expectedState) return loginError(request, "google_failed");

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const { email } = await verifyGoogleCallback(code, redirectUri);
    const user = await getUserByEmail(email);
    if (!user) return loginError(request, "google_unauthorized");

    const session = await createSession(user.id);
    const res = NextResponse.redirect(new URL(from, request.url));
    res.cookies.set(SESSION_COOKIE, session.id, sessionCookieOptions(session.expiresAt));
    res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { ...oauthCookieOptions(), maxAge: 0 });
    res.cookies.set(GOOGLE_OAUTH_FROM_COOKIE, "", { ...oauthCookieOptions(), maxAge: 0 });
    return res;
  } catch {
    return loginError(request, "google_failed");
  }
}
