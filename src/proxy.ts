// ─── Middleware ───────────────────────────────────────────────────────────────
// Runs on every request at the edge, before any page or API route.
//
// CURRENT STATE: passthrough — no logic applied.
// Security headers are handled in next.config.ts for now.
//
// ADD HERE WHEN:
//   • API routes land         → rate limiting per IP (upstash/ratelimit)
//   • Auth is required        → session/token validation before route access
//   • AI features go live     → request validation, input sanitization hooks
//   • Interactive projects    → per-project rate limits, feature flags
//
// IMPORTANT (prompt injection defense):
//   When any route accepts user input that touches an LLM, that input must be
//   validated and sandboxed HERE before it reaches the API route. Never
//   interpolate raw user input directly into a system prompt.
//
// See: https://nextjs.org/docs/app/building-your-application/routing/middleware

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Passthrough — extend this function as features are added.
  return NextResponse.next();
}

export const config = {
  // Scope middleware to API routes only for now.
  // Expand to '/(.*)'  when edge logic is needed on all routes.
  matcher: '/api/:path*',
};
