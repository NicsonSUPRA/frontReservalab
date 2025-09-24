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

type Notificacao = { type: "success" | "error" | "info"; message: string } | null;

export default function UsuarioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [originalUsuario, setOriginalUsuario] = useState<Usuario | null>(null);
    const [roleSelecionada, setRoleSelecionada] = useState<string>("");
    const [senha, setSenha] = useState("");
    const [notificacao, setNotificacao] = useState<Notificacao>(null);
    const [loading, setLoading] = useState(true); // usado para carregar
    const [saving, setSaving] = useState(false); // usado para atualizar
    const [editando, setEditando] = useState(false);

    const router = useRouter();
    const params = useParams();
    const id = (params as any)?.id as string | undefined;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // Classe padrão para inputs (força contraste)
    const INPUT_CLASS =
        "w-full px-4 py-2 border rounded-lg bg-white text-gray-900 placeholder-gray-500 border-gray-300 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition";

    // Proteção de rota
    useEffect(() => {
        if (!token) router.push("/login");
    }, [router, token]);

    // Buscar usuário
    useEffect(() => {
        if (!id || !token) return;
        let mounted = true;
        const fetchUsuario = async () => {
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:8080/usuarios/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Erro ao buscar usuário");
                const data = await res.json();
                if (!mounted) return;
                setUsuario(data);
                setOriginalUsuario(data);
                setRoleSelecionada(data.roles?.[0] || "");
            } catch (error) {
                console.error(error);
                setNotificacao({ type: "error", message: "Falha ao carregar usuário." });
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchUsuario();
        return () => {
            mounted = false;
        };
    }, [id, token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!usuario) return;
        setUsuario({ ...usuario, [e.target.name]: e.target.value } as Usuario);
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => setRoleSelecionada(e.target.value);
    const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => setSenha(e.target.value);

    const validate = () => {
        if (!usuario) return false;
        if (!usuario.nome || !usuario.nome.trim()) {
            setNotificacao({ type: "error", message: "Nome é obrigatório." });
            return false;
        }
        if (senha && senha.length > 0 && senha.length < 6) {
            setNotificacao({ type: "error", message: "A nova senha precisa ter ao menos 6 caracteres." });
            return false;
        }
        return true;
    };

    const handleAtualizar = async () => {
        if (!usuario || !token) return;
        setNotificacao(null);
        if (!validate()) return;

        setSaving(true);
        try {
            const body: { nome?: string; senha?: string; roles?: string[] } = {};
            body.nome = usuario.nome;
            if (senha) body.senha = senha;
            body.roles = [roleSelecionada];

            const res = await fetch(`http://localhost:8080/usuarios?id=${usuario.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setNotificacao({ type: "success", message: "Usuário atualizado com sucesso!" });
                setEditando(false);
                setSenha("");
                setOriginalUsuario({ ...usuario, roles: [roleSelecionada] });
            } else {
                const data = await res.json().catch(() => ({}));
                setNotificacao({ type: "error", message: data.mensagem || data.message || "Erro ao atualizar usuário." });
            }
        } catch (error) {
            console.error(error);
            setNotificacao({ type: "error", message: "Falha na conexão com o servidor." });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelar = () => {
        if (originalUsuario) {
            setUsuario(originalUsuario);
            setRoleSelecionada(originalUsuario.roles?.[0] || "");
        }
        setSenha("");
        setEditando(false);
        setNotificacao(null);
    };

    if (loading)
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center p-6">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full mx-auto mb-4" />
                    <div className="text-gray-700">Carregando usuário...</div>
                </div>
            </div>
        );

    if (!usuario)
        return (
            <div className="p-8 text-center text-red-500">Usuário não encontrado ou erro ao carregar.</div>
        );

    return (
        <div className="flex min-h-screen font-sans bg-gradient-to-b from-gray-50 to-white">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="p-3 sm:p-4 bg-white md:hidden flex items-center shadow-sm sticky top-0 z-10">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-blue-700 hover:text-blue-900 transition-colors px-2 py-1 rounded">
                        ☰
                    </button>
                    <h1 className="ml-3 font-bold text-base sm:text-lg text-gray-700">Sistema de Reservas</h1>
                </header>

                <main className="flex-1 p-4 sm:p-8 flex justify-center items-start py-8">
                    <div className="bg-white shadow-xl rounded-2xl w-full max-w-full sm:max-w-2xl p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">{editando ? "Editar Usuário" : "Visualizar Usuário"}</h1>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">ID: <span className="font-mono text-xs text-gray-600">{usuario.id}</span></p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="text-sm text-gray-600 hidden sm:block">Grupos:</div>
                                <div className="flex gap-2 flex-wrap">
                                    {usuario.roles?.map((r) => (
                                        <span key={r} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={usuario.nome}
                                    onChange={handleChange}
                                    disabled={!editando}
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-50" : "bg-white"}`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                                <input type="text" name="login" value={usuario.login} disabled className={`${INPUT_CLASS} bg-gray-50`} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha (nova)</label>
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={handleSenhaChange}
                                    disabled={!editando}
                                    placeholder="Digite a nova senha"
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-50" : "bg-white"}`}
                                />
                                <div className="text-xs text-gray-500 mt-2">Deixe em branco para manter a senha atual.</div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                                <select
                                    name="roles"
                                    value={roleSelecionada}
                                    onChange={handleRoleChange}
                                    disabled={!editando}
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-50" : "bg-white"}`}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ações - responsivas: coluna no mobile, linha no desktop */}
                            {!editando && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditando(true);
                                        setNotificacao(null);
                                    }}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                                >
                                    Liberar edição
                                </button>
                            )}

                            {editando && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        onClick={handleAtualizar}
                                        disabled={saving}
                                        className={`w-full sm:flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors ${saving ? "opacity-70 cursor-wait" : ""
                                            }`}
                                    >
                                        {saving ? "Atualizando..." : "Atualizar"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCancelar}
                                        disabled={saving}
                                        className="w-full sm:flex-1 bg-gray-400 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </form>

                        {notificacao && (
                            <div className={`mt-6 p-4 rounded-lg text-sm font-medium ${notificacao.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                {notificacao.message}
                            </div>
                        )}

                        {/* preview — fica abaixo do formulário no mobile e ao lado em telas maiores */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                            <div className="col-span-1 sm:col-span-1">
                                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center font-semibold text-indigo-700 mx-auto sm:mx-0">
                                    {usuario.nome?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "UU"}
                                </div>
                            </div>

                            <div className="col-span-2 sm:col-span-2 text-center sm:text-left">
                                <div className="font-medium text-gray-800">Pré-visualização</div>
                                <div className="text-gray-500 text-sm">
                                    Nome: <span className="font-medium text-gray-700">{usuario.nome || "—"}</span>
                                    <span className="mx-2 hidden sm:inline">·</span>
                                    <br className="sm:hidden" />
                                    Login: <span className="font-medium text-gray-700">{usuario.login || "—"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
