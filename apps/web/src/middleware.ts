import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes — always allowed
        if (
          pathname.startsWith("/join/") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/chat") ||
          pathname === "/login"
        ) {
          return true;
        }

        // Call page: allowed if token exists (agent) or if customer state is set (handled client-side)
        if (pathname.startsWith("/call/")) return true;

        // All other routes require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
