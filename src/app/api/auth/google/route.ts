import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_FROM_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  createOAuthState,
  isGoogleAuthConfigured,
  oauthCookieOptions,
  safeRedirectPath,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_misconfigured", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const state = createOAuthState();
  const from = safeRedirectPath(searchParams.get("from"));
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authUrl = buildGoogleAuthUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, oauthCookieOptions());
  res.cookies.set(GOOGLE_OAUTH_FROM_COOKIE, from, oauthCookieOptions());
  return res;
}
