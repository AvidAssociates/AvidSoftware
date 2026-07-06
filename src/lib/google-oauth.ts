import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_OAUTH_FROM_COOKIE = "google_oauth_from";

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return new OAuth2Client(clientId, clientSecret);
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export function buildGoogleAuthUrl(redirectUri: string, state: string) {
  const client = getGoogleClient();
  if (!client) throw new Error("Google OAuth is not configured");

  return client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    redirect_uri: redirectUri,
    prompt: "select_account",
  });
}

export async function verifyGoogleCallback(code: string, redirectUri: string) {
  const client = getGoogleClient();
  if (!client) throw new Error("Google OAuth is not configured");

  const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });
  if (!tokens.id_token) throw new Error("Google did not return an ID token");

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("Google account has no email");
  if (payload.email_verified === false) throw new Error("Google email is not verified");

  return { email: payload.email };
}

export function oauthCookieOptions(maxAge = 600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function safeRedirectPath(from: string | undefined | null) {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/";
}
