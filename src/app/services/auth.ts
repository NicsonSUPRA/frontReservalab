// services/auth.ts
export interface LoginResponse {
    login: string;
    token: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL; // 👈 pega do .env.local

export async function login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_URL}/usuarios/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
        throw new Error('Usuário ou senha inválidos');
    }

    const data: LoginResponse = await res.json();

    // salva token e login no navegador
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('login', data.login);
    }

    return data;
}
