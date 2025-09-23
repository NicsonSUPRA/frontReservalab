"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

const ROLES = [
    { value: "ADMIN", label: "Administrador" },
    { value: "PROF_COMP", label: "Professor de Computação" },
    { value: "PROF", label: "Professor" },
    { value: "FUNCIONARIO", label: "Funcionário" },
    { value: "ALUNO", label: "Aluno" },
];

export default function CadastrarUsuarioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [nome, setNome] = useState("");
    const [login, setLogin] = useState("");
    const [senha, setSenha] = useState("");
    const [role, setRole] = useState("ALUNO");
    const [notificacao, setNotificacao] = useState<string | null>(null);

    const router = useRouter();
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            router.push("/login");
            return;
        }

        setNotificacao(null);

        try {
            const res = await fetch(
                `http://localhost:8080/usuarios/cadastrar/${role}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ nome, login, senha }),
                }
            );

            const data = await res.json();

            if (res.ok) {
                setNotificacao("Usuário cadastrado com sucesso!");

                // Redireciona para a página do usuário criado
                if (data.location) {
                    const id = data.location.split("/").pop();
                    if (id) {
                        router.push(`/usuarios/${id}`);
                    }
                }
            } else {
                setNotificacao(data.mensagem || "Erro ao cadastrar usuário.");
            }
        } catch (error) {
            console.error(error);
            setNotificacao("Falha na conexão com o servidor.");
        }
    };

    return (
        <div className="flex min-h-screen font-sans bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <header className="p-4 bg-white md:hidden flex items-center shadow-sm sticky top-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-blue-700 hover:text-blue-900 transition-colors"
                    >
                        ☰
                    </button>
                    <h1 className="ml-4 font-bold text-lg text-gray-700">
                        Sistema de Reservas
                    </h1>
                </header>

                <main className="flex-1 p-8 flex justify-center items-center">
                    <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                            Cadastrar Usuário
                        </h1>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    required
                                    placeholder="Digite o nome"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 
                  focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Login
                                </label>
                                <input
                                    type="text"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    required
                                    placeholder="Digite o login"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 
                  focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                    placeholder="Digite a senha"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 
                  focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                >
                                    {ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Cadastrar
                            </button>
                        </form>

                        {notificacao && (
                            <div className="mt-6 p-4 rounded-lg bg-green-100 text-green-800 font-semibold text-center">
                                {notificacao}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
