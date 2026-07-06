"use client";

import { FormEvent, useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import loginLogo from "@/assets/login-logo.png";

const LOGIN_ANIM_DELAY_MS = 1000;

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
      <label className="login-field">
        Email
        <input
          className="login-input"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="justiceb@theavidassociates.com"
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
          onChange={(e) => onPassword(e.target.value)}
          placeholder="••••"
          required
        />
      </label>
      <div className="login-error-slot">{error ? <div className="login-error">{error}</div> : null}</div>
      <button className="login-submit" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
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
  const [logoEpoch, setLogoEpoch] = useState(() => Date.now());

  const restartLogoAnimation = useCallback(() => {
    setLogoEpoch(Date.now());
  }, []);

  const replayEntry = useCallback(() => {
    setPlayAnimations(false);
    restartLogoAnimation();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPlayAnimations(true);
      return undefined;
    }

    const startId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPlayAnimations(true));
    });

    return () => {
      cancelAnimationFrame(startId);
    };
  }, [restartLogoAnimation]);

  useEffect(() => {
    const cleanup = replayEntry();

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      cleanup?.();
      replayEntry();
    };

    window.addEventListener("pageshow", onPageShow);

    return () => {
      cleanup?.();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [replayEntry]);

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
    <div className="login-page">
      <div className="login-stack">
        <img
          key={logoEpoch}
          src={`${loginLogo.src}?t=${logoEpoch}`}
          alt="Avid Associates"
          className={logoClass}
          width={loginLogo.width}
          height={loginLogo.height}
        />
        <div className="login-dialog-wrap">
          <div className={dialogClass}>
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
