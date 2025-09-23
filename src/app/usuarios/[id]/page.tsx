"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

interface Usuario {
    id: string;
    nome: string;
    login: string;
    roles: string[];
}

const ROLES = [
    { value: "ADMIN", label: "Administrador" },
    { value: "PROF_COMP", label: "Professor de Computação" },
    { value: "PROF", label: "Professor" },
    { value: "FUNCIONARIO", label: "Funcionário" },
    { value: "ALUNO", label: "Aluno" },
];

export default function UsuarioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [originalUsuario, setOriginalUsuario] = useState<Usuario | null>(null);
    const [roleSelecionada, setRoleSelecionada] = useState<string>("");
    const [senha, setSenha] = useState(""); // nova senha
    const [notificacao, setNotificacao] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(false);

    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // Proteção de rota
    useEffect(() => {
        if (!token) router.push("/login");
    }, [router, token]);

    // Buscar usuário
    useEffect(() => {
        if (!id || !token) return;

        const fetchUsuario = async () => {
            try {
                const res = await fetch(`http://localhost:8080/usuarios/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Erro ao buscar usuário");
                const data = await res.json();
                setUsuario(data);
                setOriginalUsuario(data); // salva estado original
                setRoleSelecionada(data.roles?.[0] || "");
            } catch (error) {
                console.error(error);
                setNotificacao("Falha ao carregar usuário.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsuario();
    }, [id, token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!usuario) return;
        setUsuario({ ...usuario, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRoleSelecionada(e.target.value);
    };

    const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSenha(e.target.value);
    };

    const handleAtualizar = async () => {
        if (!usuario || !token) return;

        setNotificacao(null);

        try {
            const body: { nome?: string; senha?: string; roles?: string[] } = {};
            if (usuario.nome) body.nome = usuario.nome;
            if (senha) body.senha = senha;
            body.roles = [roleSelecionada];

            const res = await fetch(`http://localhost:8080/usuarios?id=${usuario.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setNotificacao("Usuário atualizado com sucesso!");
                setEditando(false);
                setSenha("");
                setOriginalUsuario({ ...usuario, roles: [roleSelecionada] });
            } else {
                const data = await res.json();
                setNotificacao(data.mensagem || "Erro ao atualizar usuário.");
            }
        } catch (error) {
            console.error(error);
            setNotificacao("Falha na conexão com o servidor.");
        }
    };

    const handleCancelar = () => {
        if (originalUsuario) {
            setUsuario(originalUsuario);
            setRoleSelecionada(originalUsuario.roles?.[0] || "");
        }
        setSenha("");
        setEditando(false);
    };

    if (loading) return <p className="p-8 text-gray-700">Carregando...</p>;
    if (!usuario) return <p className="p-8 text-red-500">Usuário não encontrado.</p>;

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
                    <h1 className="ml-4 font-bold text-lg text-gray-700">Sistema de Reservas</h1>
                </header>

                <main className="flex-1 p-8 flex justify-center items-center">
                    <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                            {editando ? "Editar Usuário" : "Visualizar Usuário"}
                        </h1>

                        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Nome</label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={usuario.nome}
                                    onChange={handleChange}
                                    disabled={!editando}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${editando ? "bg-white" : "bg-gray-100"
                                        } text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Login</label>
                                <input
                                    type="text"
                                    name="login"
                                    value={usuario.login}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 placeholder-gray-400 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Senha (nova)</label>
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={handleSenhaChange}
                                    disabled={!editando}
                                    placeholder="Digite a nova senha"
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${editando ? "bg-white" : "bg-gray-100"
                                        } text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Role</label>
                                <select
                                    name="roles"
                                    value={roleSelecionada}
                                    onChange={handleRoleChange}
                                    disabled={!editando}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${editando ? "bg-white" : "bg-gray-100"
                                        } text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {!editando && (
                                <button
                                    type="button"
                                    onClick={() => setEditando(true)}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                                >
                                    Liberar edição
                                </button>
                            )}

                            {editando && (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAtualizar}
                                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        Atualizar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelar}
                                        className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
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
