// Middleware disabled — auth handled client-side via AuthProvider
// This avoids cookie race conditions on mobile browsers

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
