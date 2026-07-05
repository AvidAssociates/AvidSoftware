import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const SESSION_COOKIE = "avid_session";
const SESSION_DAYS = 30;

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
};

export function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function sessionExpiryISO() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d.toISOString();
}

function isExpired(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

function toUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const db = getDb();
  const [row] = (await db.sql`
    SELECT id, email, password_hash, display_name FROM users WHERE email = ${email.trim()}
  `) as UserRow[];
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return toUser(row);
}

export async function createSession(userId: string) {
  const db = getDb();
  const id = createHash("sha256").update(randomBytes(32)).digest("hex").slice(0, 48);
  const expiresAt = sessionExpiryISO();
  await db.sql`
    INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})
  `;
  return { id, expiresAt };
}

export async function deleteSession(sessionId: string) {
  await getDb().sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function getUserBySession(sessionId: string): Promise<AuthUser | null> {
  const db = getDb();
  const [row] = (await db.sql`
    SELECT s.id, s.expires_at, u.id AS user_id, u.email, u.display_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId}
  `) as { id: string; expires_at: string; user_id: string; email: string; display_name: string }[];
  if (!row) return null;
  if (isExpired(row.expires_at)) {
    await deleteSession(row.id);
    return null;
  }
  return { id: row.user_id, email: row.email, displayName: row.display_name };
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getUserBySession(sessionId);
}

export function sessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}
