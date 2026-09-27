import { crossSiteDenied, signOut } from "@/lib/auth";

// POST /api/auth/logout: plain form post from the staff header, so it works without JavaScript
export async function POST(request: Request) {
  // Only our own pages may sign someone out
  const denied = crossSiteDenied(request);
  if (denied) return denied;

  await signOut();
  return new Response(null, { status: 303, headers: { Location: "/login", "Cache-Control": "no-store" } });
}
