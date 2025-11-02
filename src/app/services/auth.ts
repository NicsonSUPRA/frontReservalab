// services/auth.ts
// Login / Logout cliente robusto — remove cookie do cliente (várias variações) e chama logout no servidor para limpar HttpOnly cookies.
// Ajuste COOKIE_DOMAIN conforme seu domínio real (ex: ".reservalab.digital").

export interface LoginResponse {
    login: string;
    token: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const TOKEN_KEY = "token";
const LOGIN_KEY = "login";
const COOKIE_DOMAIN = ".reservalab.digital"; // <<--- ajuste aqui conforme seu domínio

// Decodifica payload do JWT sem dependências (cliente)
function parseJwtPayload(token: string) {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        const decoded = atob(base64);
        // decoded pode ser binário UTF-8; use decodeURIComponent trick
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

// Helper: tenta remover cookie no cliente em várias formas (com/sem domain, secure/sem secure)
function clearClientCookie(name = TOKEN_KEY) {
    if (typeof document === "undefined") return;

    // variação padrão (sem domain)
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; Secure`;

    // variação com domain (subdomínios)
    try {
        document.cookie = `${name}=; path=/; domain=${COOKIE_DOMAIN}; max-age=0; SameSite=Lax; Secure`;
    } catch (e) {
        // alguns browsers podem lançar se domain inválido; ignorar
        // console.warn("clearClientCookie(domain) failed:", e);
    }

    // variações sem Secure (útil para alguns dev setups)
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    try {
        document.cookie = `${name}=; path=/; domain=${COOKIE_DOMAIN}; max-age=0; SameSite=Lax`;
    } catch { }
}

// login: grava token no localStorage e cria cookie cliente (para middleware ler em Edge)
// usa credentials: 'include' para permitir backend setar cookie HttpOnly se desejar
export async function login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_URL}/usuarios/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // permite backend setar cookie HttpOnly
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Usuário ou senha inválidos");
    }

    const data: LoginResponse = await res.json();

    if (typeof window !== "undefined") {
        // salva em localStorage (para uso client)
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(LOGIN_KEY, data.login);

        // calcula max-age a partir do exp do token, se existir
        const payload = parseJwtPayload(data.token);
        const now = Math.floor(Date.now() / 1000);
        const maxAge = payload?.exp ? Math.max(0, payload.exp - now) : 24 * 3600;

        // cria cookie cliente compartilhado entre subdomínios (útil para middleware rodando no Edge)
        // secure + sameSite=lax + domain permitem disponibilidade entre subdomínios
        // se você prefere que o cookie seja HttpOnly, faça isso no backend e remova document.cookie aqui.
        document.cookie = `token=${data.token}; path=/; max-age=${maxAge}; domain=${COOKIE_DOMAIN}; SameSite=Lax; Secure`;
    }

    return data;
}

// Pega token do localStorage (client)
export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function isTokenExpired(): boolean {
    const token = getToken();
    if (!token) return true;
    const payload = parseJwtPayload(token);
    if (!payload?.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
}

// chama endpoint do backend para limpar cookie HttpOnly (se backend setou HttpOnly cookie)
async function logoutServer(): Promise<void> {
    try {
        await fetch(`${API_URL}/usuarios/logout`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
    } catch (err) {
        // não bloquear logout cliente se falhar
        console.warn("logoutServer falhou:", err);
    }
}

// logout robusto: limpa localStorage, limpa cookie cliente (várias variações) e chama backend pra limpar HttpOnly
export function clearAuthCookie() {
    if (typeof document === "undefined") return;

    const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
    const hostDomain = "nicsontcc.reservalab.digital"; // ⚠ use exatamente o que aparece no DevTools

    // remove cookie usando domain exato
    document.cookie = `token=; Path=/; Domain=${hostDomain}; Expires=${expires}; Secure; SameSite=None`;

    // remove cookie sem domain (fallback para localhost/dev)
    document.cookie = `token=; Path=/; Expires=${expires}; Secure; SameSite=None`;
}

export async function logout() {
    // limpa localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("login");

    // limpa cookie
    clearAuthCookie();

    // chama backend logout (opcional)
    try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/logout`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
    } catch (err) {
        console.warn("Erro logout backend:", err);
    }

    // redireciona
    window.location.replace("/login");
}

