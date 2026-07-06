"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, Suspense } from "react";
import type { AnimationEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import loginLogo from "@/assets/login-logo.png";

const LOGIN_ANIM_DELAY_MS = 1000;
const LOGIN_COLLAPSE_MS = 450;
const LOGIN_SPINNER_MS = 500;

type AuthOutcome = { ok: true; path: string } | { ok: false; error: string };
type ExitPhase = "idle" | "collapsing" | "spinning";

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_unauthorized: "This Google account is not authorized to sign in.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  google_misconfigured: "Google sign-in is not available right now.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.761 0 5.262 1.062 7.142 2.794l5.657-5.657C33.64 10.053 29.082 8 24 8 14.059 8 6 16.059 6 26s8.059 18 18 18 18-8.059 18-18c0-1.214-.124-2.39-.389-3.517z"
      />
      <path
        fill="#FF3D00"
        d="M6 26c0-1.64.402-3.186 1.117-4.557l-5.657-5.657C.795 18.558 0 22.127 0 26s.795 7.442 2.46 10.214l6.657-5.657C7.598 29.186 6 27.64 6 26z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c4.795 0 8.97-1.64 12.071-4.428l-5.657-5.657C28.795 35.091 26.477 36 24 36c-5.223 0-9.654-3.343-11.303-8H7.117v5.657C10.211 40.947 16.618 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 5.657 5.657C36.752 39.99 42 34 42 26c0-1.214-.124-2.39-.389-3.517z"
      />
    </svg>
  );
}

function LoginCard({
  email,
  password,
  error,
  loading,
  onEmail,
  onPassword,
  onSubmit,
  onGoogleSignIn,
  showGoogle,
  disabled = false,
}: {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  disabled?: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onGoogleSignIn: () => void;
  showGoogle: boolean;
}) {
  return (
    <div className="login-card">
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
          disabled={disabled}
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
          disabled={disabled}
        />
      </label>
      <div className="login-error-slot">{error ? <div className="login-error">{error}</div> : null}</div>
      <button className="login-submit" type="submit" disabled={loading || disabled}>
        Sign in
      </button>
      </form>
      {showGoogle ? (
        <>
          <div className="login-divider" aria-hidden="true">
            <span>or</span>
          </div>
          <button
            type="button"
            className="login-google-btn"
            onClick={onGoogleSignIn}
            disabled={loading || disabled}
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        </>
      ) : null}
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
  const [playAnimations, setPlayAnimations] = useState(false);
  const [entrySettled, setEntrySettled] = useState(false);
  const [exitPhase, setExitPhase] = useState<ExitPhase>("idle");
  const [logoEpoch, setLogoEpoch] = useState(() => Date.now());
  const authOutcomeRef = useRef<Promise<AuthOutcome> | null>(null);
  const exitPhaseRef = useRef<ExitPhase>("idle");
  const collapseHandledRef = useRef(false);
  const exitBusy = exitPhase !== "idle";
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;
    const message = GOOGLE_ERROR_MESSAGES[code];
    if (message) setError(message);
  }, [searchParams]);

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

  const onEntryAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === "loginSlideUp") setEntrySettled(true);
  }, []);

  const startGoogleSignIn = useCallback(() => {
    if (exitBusy) return;
    setError("");
    const from = searchParams.get("from");
    const url =
      from && from.startsWith("/")
        ? `/api/auth/google?from=${encodeURIComponent(from)}`
        : "/api/auth/google";
    window.location.href = url;
  }, [exitBusy, searchParams]);

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
              showGoogle={googleEnabled}
              onGoogleSignIn={startGoogleSignIn}
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
                  showGoogle={false}
                  onGoogleSignIn={() => {}}
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
