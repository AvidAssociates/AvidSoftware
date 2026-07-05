"use client";

import { FormEvent, useState, Suspense } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FONT } from "@/lib/ui";
import { LOGO_FULL_SRC } from "@/lib/logos";

function LoginLogo() {
  if (!LOGO_FULL_SRC) return <div className="login-logo-slot" aria-hidden="true" />;
  return (
    <div className="login-logo-slot">
      <img src={LOGO_FULL_SRC} alt="Avid Associates" className="login-logo" width={220} height={330} />
    </div>
  );
}

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
      <div className="login-stack">
        <LoginLogo />
        <div className="login-dialog-shell">
          <div className="login-dialog login-dialog-enter">
            <div className="login-dialog-header">
              <h1 className="login-title">Sign in</h1>
              <p className="login-subtitle">Access your dashboard</p>
            </div>

            <form onSubmit={onSubmit} className="login-form">
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

              {error ? <div className="login-error">{error}</div> : null}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
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
          <div className="login-stack">
            <LoginLogo />
            <div className="login-dialog-shell">
              <div className="login-dialog login-dialog-enter" />
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
