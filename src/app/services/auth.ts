// services/auth.ts
export interface LoginResponse {
    login: string;
    token: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch('http://localhost:8080/usuarios/auth', {
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
    localStorage.setItem('token', data.token); // salva token no navegador
    localStorage.setItem('login', data.login);
    return data;
}
