import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "@/components/AppIcon";
import { useAuth } from "@/hooks/use-auth";
import { hadSession } from "@/lib/sessionBreadcrumb";
import { useTheme } from "@/hooks/use-theme";
import drishtiLogoLight from "@/assets/brand/drishti-logo-light.svg";
import drishtiLogoDark from "@/assets/brand/drishti-logo-dark.svg";

export default function Login() {
  const { isAuthenticated, isInitializing, isRecovering, login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /*
   * Read once on mount: signing in clears the breadcrumb, and we do not want
   * the notice to vanish mid-typing. Shown only when a session existed in this
   * tab and is now gone - not after an explicit logout, and not on a first
   * visit, where it would be baffling.
   */
  const [hadOne] = useState(() => hadSession());

  /*
   * A breadcrumb says a session existed here; it does not say the session
   * ended. While a refresh is still being retried the server has not told us
   * anything of the sort — it was rate limited, or unreachable — so claiming
   * the session ended is a guess, and one that turns out wrong as soon as
   * the retry lands and puts the user straight back where they were.
   *
   * So: recovery wins while it is running, and the expiry notice waits until
   * the question has actually been answered.
   */
  const sessionEnded = hadOne && !isRecovering;

  if (!isInitializing && isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError("error" in result ? result.error : "Sign in failed");
      return;
    }
    navigate("/", { replace: true });
  };

  const field =
    "h-11 w-full rounded-full border border-muted bg-container px-4 text-body-md text-primary placeholder:text-quaternary " +
    "outline-none transition-colors hover:border-default focus-visible:border-default focus-visible:ring-2 focus-visible:ring-active";

  return (
    <div className="flex min-h-screen bg-page">
      {/* Hero — the Chronos sign-in split: the product's idea on the left. */}
      <aside className="relative hidden flex-1 overflow-hidden bg-[#0b0b0c] lg:flex lg:flex-col lg:justify-end">
        <FlowArt />
        <div className="relative z-10 max-w-2xl p-10">
          <p className="font-display text-display-4xl text-white">See where PHI goes.</p>
          <p className="mt-3 max-w-md text-body-lg text-white/70">
            Who can reach it, where it leaves unprotected, and what to fix first — across every system
            you run.
          </p>
        </div>
      </aside>

      <main className="flex w-full flex-col px-6 py-6 sm:px-10 lg:w-[480px] lg:flex-none lg:border-l lg:border-muted">
        <img
          src={theme === "dark" ? drishtiLogoDark : drishtiLogoLight}
          alt="Drishti"
          className="h-8 self-start object-contain"
        />

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-display-xl text-primary">Sign in to Drishti</h1>
          <p className="mt-1 text-body-md text-tertiary">
            Healthcare PHI risk intelligence, in one console
          </p>

          {isRecovering && !error && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 flex items-start gap-2 rounded-lg border border-muted bg-container px-3 py-2.5 text-body-sm text-secondary"
            >
              <span
                aria-hidden
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-active border-t-transparent"
              />
              <span>Checking your session… you can sign in below if you prefer not to wait.</span>
            </div>
          )}

          {sessionEnded && !error && (
            <div
              role="status"
              className="mt-6 flex items-start gap-2 rounded-lg bg-feedback-info-background px-3 py-2.5 text-body-sm text-feedback-info"
            >
              <AppIcon name="info" size="sm" className="mt-0.5 flex-shrink-0 text-feedback-info-icon" />
              <span>Your session ended. Please sign in again to continue.</span>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-caption uppercase tracking-[0.08em] text-quaternary">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@drishti.ai"
                className={field}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-caption uppercase tracking-[0.08em] text-quaternary">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${field} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-action hover:text-primary"
                >
                  {showPassword ? <AppIcon name="hidden" size="md" /> : <AppIcon name="visible" size="md" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-feedback-error-background px-3 py-2 text-body-md text-feedback-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="!mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-action-primary text-label-md text-on-color outline-none transition-colors hover:bg-action-primary-hover focus-visible:ring-2 focus-visible:ring-active disabled:cursor-not-allowed disabled:bg-action-primary-disabled"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-5 flex items-start gap-2 text-body-sm text-tertiary">
            <AppIcon name="compliance" size="sm" className="mt-0.5 flex-shrink-0 text-icon-quaternary" />
            <span>Sign in with your Drishti account. Credentials are verified by the API.</span>
          </p>
        </div>

        <p className="text-caption font-normal text-quaternary">Drishti by Wayam AI · Demo Environment</p>
      </main>
    </div>
  );
}

/**
 * Abstract PHI flow: ribbons converging on one core system and fanning out,
 * with a single red ribbon — the unencrypted one. Decorative only.
 */
function FlowArt() {
  const inbound = [90, 190, 300, 410, 520];
  const outbound = [140, 260, 380, 500];
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="flow-in" x1="0" x2="1">
          <stop offset="0" stopColor="#ff7b1c" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ff7b1c" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="flow-out" x1="0" x2="1">
          <stop offset="0" stopColor="#ff7b1c" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff7b1c" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id="flow-glow">
          <stop offset="0" stopColor="#ff7b1c" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff7b1c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="flow-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#0b0b0c" stopOpacity="0" />
          <stop offset="1" stopColor="#0b0b0c" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <circle cx="400" cy="300" r="260" fill="url(#flow-glow)" />
      {inbound.map((y, i) => (
        <path
          key={`in-${y}`}
          d={`M-20 ${y} C 200 ${y}, 240 300, 372 300`}
          fill="none"
          stroke="url(#flow-in)"
          strokeWidth={10 + i * 4}
          strokeLinecap="round"
        />
      ))}
      {outbound.map((y, i) => {
        const leak = i === 1;
        return (
          <path
            key={`out-${y}`}
            d={`M428 300 C 560 300, 600 ${y}, 820 ${y}`}
            fill="none"
            stroke={leak ? "#e9343c" : "url(#flow-out)"}
            strokeOpacity={leak ? 0.8 : 1}
            strokeWidth={leak ? 6 : 12 + i * 3}
            strokeLinecap="round"
            className={leak ? "dash-flow" : undefined}
          />
        );
      })}
      <rect x="372" y="236" width="56" height="128" rx="10" fill="#161618" stroke="#ff7b1c" strokeOpacity="0.8" />
      <rect x="372" y="236" width="4" height="128" rx="2" fill="#ff7b1c" />
      <rect x="0" y="0" width="800" height="700" fill="url(#flow-fade)" />
    </svg>
  );
}
