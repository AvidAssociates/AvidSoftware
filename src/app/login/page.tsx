"use client";

import { FormEvent, useCallback, useEffect, useState, Suspense } from "react";
import type { AnimationEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import loginLogo from "@/assets/login-logo.png";

const LOGIN_ANIM_DELAY_MS = 1000;
const LOGIN_ANIM_DURATION_MS = 950;

function LoginFormSkeleton() {
  return (
    <div className="login-form login-form-skeleton" aria-hidden="true">
      <label className="login-field">
        <span className="login-label">Email</span>
        <span className="login-input login-input-skeleton" />
      </label>
      <label className="login-field">
        <span className="login-label">Password</span>
        <span className="login-input login-input-skeleton" />
      </label>
      <span className="login-submit login-submit-skeleton" />
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
  const [formReady, setFormReady] = useState(false);

  const revealForm = useCallback(() => {
    setFormReady(true);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      revealForm();
      return;
    }
    const fallback = window.setTimeout(revealForm, LOGIN_ANIM_DELAY_MS + LOGIN_ANIM_DURATION_MS + 50);
    return () => window.clearTimeout(fallback);
  }, [revealForm]);

  const onDialogAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName === "loginSlideUp") revealForm();
    },
    [revealForm],
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formReady) return;
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
    <div className={`login-page${formReady ? " login-page--active" : ""}`}>
      <div className="login-stack">
        <img
          src={loginLogo.src}
          alt="Avid Associates"
          className="login-logo"
          width={loginLogo.width}
          height={loginLogo.height}
        />
        <div className={`login-dialog-shell${formReady ? " login-dialog-shell--active" : ""}`}>
          <div className="login-dialog login-dialog-enter" onAnimationEnd={onDialogAnimationEnd}>
            <div className={`login-form-frame${formReady ? " login-form-frame--live" : ""}`}>
              <LoginFormSkeleton />
              {formReady ? (
                <form onSubmit={onSubmit} className="login-form login-form-live" autoComplete="on">
                  <label className="login-field">
                    Email
                    <input
                      className="login-input"
                      type="email"
                      name="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="test"
                      required
                    />
                  </label>
                  <label className="login-field">
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

                  <button className="login-submit login-submit-live" type="submit" disabled={loading}>
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-stack">
            <img src={loginLogo.src} alt="" className="login-logo" width={loginLogo.width} height={loginLogo.height} />
            <div className="login-dialog-shell">
              <div className="login-dialog login-dialog-enter">
                <LoginFormSkeleton />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
