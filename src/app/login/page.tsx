"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, Suspense } from "react";
import type { AnimationEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import loginLogo from "@/assets/login-logo.png";

const LOGIN_ANIM_DELAY_MS = 1000;
const LOGIN_ANIM_DURATION_MS = 1000;

function LoginCard({
  email,
  password,
  error,
  loading,
  onEmail,
  onPassword,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="login-form" autoComplete="on">
      <header className="login-card-head">
        <p className="login-eyebrow">Avid Associates</p>
        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Access your send-out pipeline</p>
      </header>

      <div className="login-fields">
        <label className="login-field">
          <span className="login-field-label">Email</span>
          <div className="login-input-wrap">
            <Mail className="login-input-icon" size={16} strokeWidth={2} aria-hidden />
            <input
              className="login-input"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              aria-label="Email address"
              required
            />
          </div>
        </label>
        <label className="login-field">
          <span className="login-field-label">Password</span>
          <div className="login-input-wrap">
            <Lock className="login-input-icon" size={16} strokeWidth={2} aria-hidden />
            <input
              className="login-input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPassword(e.target.value)}
              aria-label="Password"
              required
            />
          </div>
        </label>
      </div>

      <div className="login-error-slot" role="alert" aria-live="polite">
        {error ? <div className="login-error">{error}</div> : null}
      </div>

      <button className="login-submit" type="submit" disabled={loading}>
        {loading ? (
          <>
            <span className="login-submit-spinner" aria-hidden />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [playAnimations, setPlayAnimations] = useState(false);
  const [glowActive, setGlowActive] = useState(false);
  const glowStarted = useRef(false);

  const startGlow = useCallback(() => {
    if (glowStarted.current) return;
    glowStarted.current = true;
    setGlowActive(true);
  }, []);

  useEffect(() => {
    glowStarted.current = false;
    setPlayAnimations(false);
    setGlowActive(false);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPlayAnimations(true);
      startGlow();
      return;
    }

    const startId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPlayAnimations(true));
    });

    const glowTimer = window.setTimeout(startGlow, LOGIN_ANIM_DELAY_MS + LOGIN_ANIM_DURATION_MS + 40);

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      glowStarted.current = false;
      setPlayAnimations(false);
      setGlowActive(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPlayAnimations(true));
      });
      window.setTimeout(startGlow, LOGIN_ANIM_DELAY_MS + LOGIN_ANIM_DURATION_MS + 40);
    };

    window.addEventListener("pageshow", onPageShow);

    return () => {
      cancelAnimationFrame(startId);
      window.clearTimeout(glowTimer);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [startGlow]);

  const onDialogAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName === "loginSlideUp") startGlow();
    },
    [startGlow],
  );

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

  const logoClass = `login-logo${playAnimations ? " login-logo-enter" : " login-logo-prep"}`;
  const dialogClass = `login-dialog${playAnimations ? " login-dialog-enter" : " login-dialog-prep"}`;

  return (
    <div className={`login-page${glowActive ? " login-page--glow" : ""}`}>
      <div className="login-ambient" aria-hidden>
        <div className="login-ambient-grid" />
        <div className="login-ambient-orb login-ambient-orb--left" />
        <div className="login-ambient-orb login-ambient-orb--right" />
      </div>

      <div className="login-stack">
        <img
          src={loginLogo.src}
          alt="Avid Associates"
          className={logoClass}
          width={loginLogo.width}
          height={loginLogo.height}
        />
        <div className="login-dialog-wrap">
          <div className={dialogClass} onAnimationEnd={onDialogAnimationEnd}>
            <LoginCard
              email={email}
              password={password}
              error={error}
              loading={loading}
              onEmail={setEmail}
              onPassword={setPassword}
              onSubmit={onSubmit}
            />
          </div>
        </div>
        <p className="login-footer">Authorized personnel only</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-ambient" aria-hidden>
            <div className="login-ambient-grid" />
          </div>
          <div className="login-stack">
            <img src={loginLogo.src} alt="" className="login-logo login-logo-prep" width={loginLogo.width} height={loginLogo.height} />
            <div className="login-dialog-wrap">
              <div className="login-dialog login-dialog-prep">
                <LoginCard
                  email=""
                  password=""
                  error=""
                  loading={false}
                  onEmail={() => {}}
                  onPassword={() => {}}
                  onSubmit={(e) => e.preventDefault()}
                />
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
