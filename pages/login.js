import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="wrap">
      <div className="card authcard">
        <h1>Paw<span>Due</span></h1>
        <p className="sub">Log in to your groomer dashboard</p>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit">Log in</button>
          {error && <div className="error">{error}</div>}
        </form>
        <p className="sub" style={{ marginTop: 14 }}>
          No account? <Link className="link" href="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
