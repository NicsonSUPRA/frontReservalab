// middleware.ts
// Protege rotas verificando cookie 'token' e expiracao do JWT (Edge runtime)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface JwtPayload {
    exp?: number;
    [k: string]: any;
}

// Decodifica payload do JWT no Edge runtime (atob está disponível)
function parseJwtPayload(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        const decoded = atob(base64);
        const json = decodeURIComponent(
            Array.from(decoded)
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Rotas e prefixes públicas que não exigem autenticação
    const publicPrefixes = ["/login", "/_next", "/favicon.ico", "/api/public"];
    if (publicPrefixes.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const rawToken = request.cookies.get("token")?.value;

    console.log(rawToken);

    // Sem cookie -> redireciona para login
    if (!rawToken) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Decodifica e valida exp
    const payload = parseJwtPayload(rawToken);
    const now = Math.floor(Date.now() / 1000);

    if (!payload?.exp || payload.exp < now) {
        // token inválido/expirado -> tenta remover cookie e redirecionar
        const res = NextResponse.redirect(new URL("/login", request.url));
        try {
            res.cookies.delete("token");
        } catch { }
        return res;
    }

    // token válido -> prossegue
    return NextResponse.next();
}

export const config = {
    matcher: [
        // aplica para todas as rotas da app, exceto _next static / images / arquivos estáticos
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
