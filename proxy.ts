import { NextResponse } from "next/server";

export function proxy() {
  // Auth/approval checks are handled in client pages with Supabase.
  // Cookie-only redirects here can bounce users after PIN validation.
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};
