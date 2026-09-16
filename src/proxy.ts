import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "an_session";
const PROTECTED_PREFIXES = ["/compte", "/admin", "/abonnement/"];

/**
 * Redirige vers la connexion (en conservant la page demandée) lorsqu'aucun cookie de session
 * n'est présent. La validité de la session est ensuite vérifiée côté serveur par requireUser().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const login = new URL("/connexion", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/compte/:path*", "/admin/:path*", "/abonnement/:path*"],
};
