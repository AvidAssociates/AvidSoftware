"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, Suspense } from "react";
import type { AnimationEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import loginLogo from "@/assets/login-logo.png";

const LOGIN_COLLAPSE_MS = 450;
const LOGIN_SPINNER_MS = 500;

type AuthOutcome = { ok: true; path: string } | { ok: false; error: string };
type ExitPhase = "idle" | "collapsing" | "spinning";

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function LoginCard({
  email,
  password,
  error,
  loading,
  disabled = false,
  onEmail,
  onPassword,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  disabled?: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="login-form" autoComplete="on">
      <header className="login-card-head">
        <p className="login-eyebrow">Avid Associates</p>
        <h1 className="login-title">Sign in</h1>
        <div className="login-header-rule" aria-hidden />
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
              disabled={disabled}
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
              disabled={disabled}
            />
          </div>
        </label>
      </div>

      <div className="login-error-slot" role="alert" aria-live="polite">
        {error ? <div className="login-error">{error}</div> : null}
      </div>

      <button className="login-submit" type="submit" disabled={loading || disabled}>
        Sign in
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
  const [entrySettled, setEntrySettled] = useState(false);
  const [exitPhase, setExitPhase] = useState<ExitPhase>("idle");
  const [logoEpoch, setLogoEpoch] = useState(() => Date.now());
  const authOutcomeRef = useRef<Promise<AuthOutcome> | null>(null);
  const exitPhaseRef = useRef<ExitPhase>("idle");
  const collapseHandledRef = useRef(false);
  const exitBusy = exitPhase !== "idle";

  useEffect(() => {
    exitPhaseRef.current = exitPhase;
  }, [exitPhase]);

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

  const runAuth = useCallback(async (): Promise<AuthOutcome> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) return { ok: false, error: data.error || "Sign in failed" };
      const from = searchParams.get("from");
      return { ok: true, path: from && from.startsWith("/") ? from : "/" };
    } catch {
      return { ok: false, error: "Sign in failed" };
    }
  }, [email, password, searchParams]);

  const resetAfterFailedSignIn = useCallback((message: string) => {
    authOutcomeRef.current = null;
    collapseHandledRef.current = false;
    setExitPhase("idle");
    setLoading(false);
    setError(message);
    setEntrySettled(true);
  }, []);

  const finishSuccessfulSignIn = useCallback(
    async (path: string) => {
      setExitPhase("spinning");
      await sleep(LOGIN_SPINNER_MS);
      router.replace(path);
      router.refresh();
    },
    [router],
  );

  const completeCollapse = useCallback(async () => {
    if (collapseHandledRef.current || exitPhaseRef.current !== "collapsing") return;
    collapseHandledRef.current = true;

    setExitPhase("spinning");
    const spinnerStarted = Date.now();

    const outcome = await authOutcomeRef.current;
    if (!outcome) {
      collapseHandledRef.current = false;
      setExitPhase("idle");
      return;
    }
    if (!outcome.ok) {
      resetAfterFailedSignIn(outcome.error);
      return;
    }

    const elapsed = Date.now() - spinnerStarted;
    await sleep(Math.max(0, LOGIN_SPINNER_MS - elapsed));
    router.replace(outcome.path);
    router.refresh();
  }, [resetAfterFailedSignIn, router]);

  const onDialogAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (exitPhase !== "collapsing") return;
      if (event.animationName !== "loginCollapseUp") return;
      void completeCollapse();
    },
    [completeCollapse, exitPhase],
  );

  const onEntryAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === "loginSlideUp") setEntrySettled(true);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (exitBusy) return;
    setError("");
    setLoading(true);
    authOutcomeRef.current = runAuth();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const outcome = await authOutcomeRef.current;
      if (!outcome.ok) {
        resetAfterFailedSignIn(outcome.error);
        return;
      }
      await finishSuccessfulSignIn(outcome.path);
      return;
    }

    setExitPhase("collapsing");
    window.setTimeout(() => {
      void completeCollapse();
    }, LOGIN_COLLAPSE_MS + 80);
  };

  const logoClass = `login-logo${playAnimations ? " login-logo-enter" : " login-logo-prep"}`;
  const dialogClass =
    exitPhase === "collapsing"
      ? "login-dialog login-dialog-exit"
      : exitPhase === "spinning"
        ? "login-dialog login-dialog-hidden"
        : entrySettled
          ? "login-dialog login-dialog-settled"
          : `login-dialog${playAnimations ? " login-dialog-enter" : " login-dialog-prep"}`;
  const wrapClass = `login-dialog-wrap${exitBusy ? " login-dialog-wrap--busy" : ""}`;

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
        <div className={wrapClass}>
          {exitPhase === "spinning" ? (
            <div className="login-spinner" role="status" aria-label="Signing in" />
          ) : null}
          <div
            className={dialogClass}
            onAnimationEnd={(event) => {
              onEntryAnimationEnd(event);
              onDialogAnimationEnd(event);
            }}
          >
            <LoginCard
              email={email}
              password={password}
              error={error}
              loading={loading}
              disabled={exitBusy}
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
