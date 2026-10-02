import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

/**
 * Creates a Supabase client bound to the current request's auth cookies.
 * Works both in API routes (req, res are NextApiRequest/Response) and in
 * getServerSideProps (req, res are the raw Node req/res).
 */
export function createSupabaseServerClient(req, res) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.cookie ?? "");
        },
        setAll(cookiesToSet) {
          const existing = res.getHeader("Set-Cookie");
          const existingArr = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
          const newCookies = cookiesToSet.map(({ name, value, options }) =>
            serializeCookieHeader(name, value, options)
          );
          res.setHeader("Set-Cookie", [...existingArr, ...newCookies]);
        },
      },
    }
  );
}
