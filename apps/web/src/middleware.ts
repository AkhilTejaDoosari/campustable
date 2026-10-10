import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-refresh middleware (mandatory per @supabase/ssr design):
 * refreshes the Auth session once per request and propagates refreshed
 * cookies to both the request and the response. Without env configured it
 * passes through so demo/simulated mode keeps working.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Lazy session init / refresh; never throws the request on auth failure.
  try {
    await supabase.auth.getUser();
  } catch (refreshError) {
    console.warn("[middleware] session refresh failed", refreshError);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
