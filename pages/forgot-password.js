import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

const COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  // Simple cooldown so the button cannot be hammered (the server also
  // rate-limits reset emails).
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy || wait > 0) return;
    setError("");
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Only real problems (rate limit, network) are shown. Whether the
      // address has an account is never revealed.
      if (err && /rate|limit|too many|seconds/i.test(err.message)) {
        setError("Too many requests. Please wait a minute and try again.");
      } else if (err && !/not found|no user/i.test(err.message)) {
        setError("We could not send the email right now. Please try again in a moment.");
      } else {
        setSent(true);
        setWait(COOLDOWN_SECONDS);
      }
    } catch (_) {
      setError("We could not send the email right now. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card authcard">
        <h1>Paw<span>Due</span></h1>
        <p className="sub">Reset your password</p>

        {sent ? (
          <>
            <div className="success" role="status" style={{ marginBottom: 12 }}>
              If an account exists for <b>{email.trim()}</b>, we have sent a link to reset your password. It can take a minute to arrive, so check spam too.
            </div>
            <form onSubmit={handleSubmit}>
              <button type="submit" className="ghost" disabled={busy || wait > 0}>
                {wait > 0 ? `Send again in ${wait}s` : "Send again"}
              </button>
              {error && <div className="error">{error}</div>}
            </form>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="sub" style={{ marginTop: 0 }}>Enter the email you signed up with and we will send you a reset link.</p>
            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button type="submit" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
            {error && <div className="error">{error}</div>}
          </form>
        )}

        <p className="sub" style={{ marginTop: 14 }}>
          Remembered it? <Link className="link" href="/login">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}
