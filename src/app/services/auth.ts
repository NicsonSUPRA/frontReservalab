// services/auth.ts
import { jwtDecode } from "jwt-decode";

export interface LoginResponse {
    login: string;
    token: string;
}

interface JwtPayload {
    exp: number;
    sub: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL; // 👈 do .env.local
const TOKEN_KEY = "token";
const LOGIN_KEY = "login";

export async function login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_URL}/usuarios/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
        throw new Error("Usuário ou senha inválidos");
    }

    const data: LoginResponse = await res.json();

    // Salva token e login no navegador
    if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(LOGIN_KEY, data.login);
    }

    return data;
}

// ✅ Função para pegar token do localStorage
export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

// ✅ Função para verificar expiração do token
export function isTokenExpired(): boolean {
    const token = getToken();
    if (!token) return true;

    try {
        const decoded = jwtDecode<JwtPayload>(token);
        const now = Date.now() / 1000; // segundos
        return decoded.exp < now;
    } catch {
        return true; // erro ao decodificar = token inválido
    }
}

// ✅ Função para forçar logout
export function logout() {
    if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LOGIN_KEY);
        window.location.href = "/login"; // redireciona
    }
}
