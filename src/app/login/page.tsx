"use client";

import { FormEvent, useState, Suspense } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND_RED, FONT } from "@/lib/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Sign in failed");
        return;
      }
      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") ? from : "/");
      router.refresh();
    } catch {
      setError("Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-dialog-shell">
        <div className="login-dialog login-dialog-enter">
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: "rgba(235, 235, 245, 0.45)", marginBottom: 8 }}>AVID ASSOCIATES</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.8, color: "#F2F2F7", fontFamily: FONT }}>Sign in</h1>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              Email
              <input
                className="login-input"
                type="text"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test"
                required
              />
            </label>
            <label style={labelStyle}>
              Password
              <input
                className="login-input"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                required
              />
            </label>

            {error ? <div style={{ fontSize: 13, color: BRAND_RED, fontWeight: 600 }}>{error}</div> : null}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12.5,
  fontWeight: 600,
  color: "rgba(235, 235, 245, 0.62)",
  fontFamily: FONT,
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-dialog-shell">
            <div className="login-dialog login-dialog-enter" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
