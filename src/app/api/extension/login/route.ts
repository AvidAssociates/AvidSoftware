import { NextResponse } from "next/server";
import { authenticateUser, createExtensionToken } from "@/lib/auth";
import { extensionOptions, withExtensionCors } from "@/lib/extension-api";

export async function OPTIONS(request: Request) {
  return extensionOptions(request);
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return withExtensionCors(request, NextResponse.json({ error: "email and password are required" }, { status: 400 }));
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return withExtensionCors(request, NextResponse.json({ error: "Invalid email or password" }, { status: 401 }));
  }

  const { id: token, expiresAt } = await createExtensionToken(user.id);
  return withExtensionCors(
    request,
    NextResponse.json({
      token,
      expiresAt,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    })
  );
}
