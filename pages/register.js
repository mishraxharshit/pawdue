import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export default function Register() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checkEmailMsg, setCheckEmailMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCheckEmailMsg("");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { business_name: businessName || null } },
    });

    if (error) {
      setError(error.message);
      return;
    }

    // If your Supabase project has "Confirm email" enabled (the default),
    // there's no session yet - the user must click the link in their inbox first.
    if (!data.session) {
      setCheckEmailMsg("Account created! Check your email to confirm, then log in.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="wrap">
      <div className="card authcard">
        <h1>Paw<span>Due</span></h1>
        <p className="sub">Create your groomer account</p>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Business name (optional)</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label>Password (min 8 characters)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button type="submit">Create account</button>
          {error && <div className="error">{error}</div>}
          {checkEmailMsg && <div className="sub" style={{ marginTop: 8 }}>{checkEmailMsg}</div>}
        </form>
        <p className="sub" style={{ marginTop: 14 }}>
          Already have an account? <Link className="link" href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
