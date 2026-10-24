import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

// Opened from the link in the reset email. The Supabase browser client turns
// the code in the URL into a short-lived session on its own; this page just
// waits for that session, then lets the person choose a new password.
export default function ResetPassword() {
  const router = useRouter();
  const [state, setState] = useState("checking"); // checking | ready | invalid | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setState((s) => (s === "done" ? s : "ready"));
      }
    });

    // If the link was opened and already exchanged, the session exists; if
    // nothing shows up shortly, the link is expired or was already used.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setState((s) => (s === "checking" ? (data.session ? "ready" : "invalid") : s));
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(/same|different/i.test(err.message) ? "Choose a password you have not used before." : "Could not update your password. The link may have expired, so please request a new one.");
      return;
    }
    setState("done");
    setTimeout(() => router.push("/dashboard"), 1800);
  }

  return (
    <div className="wrap">
      <div className="card authcard">
        <h1>Paw<span>Due</span></h1>

        {state === "checking" && <p className="sub">Checking your reset link...</p>}

        {state === "invalid" && (
          <>
            <p className="sub">This reset link is invalid or has expired. Links work once and for a short time.</p>
            <Link className="link" href="/forgot-password">Send me a new link</Link>
          </>
        )}

        {state === "ready" && (
          <>
            <p className="sub">Choose a new password</p>
            <form onSubmit={handleSubmit}>
              <div>
                <label>New password (min 8 characters)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoFocus />
              </div>
              <div>
                <label>Confirm new password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
              </div>
              <button type="submit" disabled={busy}>{busy ? "Saving..." : "Update password"}</button>
              {error && <div className="error">{error}</div>}
            </form>
          </>
        )}

        {state === "done" && (
          <div className="success" role="status">Password updated. Taking you to your dashboard...</div>
        )}
      </div>
    </div>
  );
}
