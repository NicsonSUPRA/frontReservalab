"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

const GRUPOS = [
    { value: "ADMIN", label: "Administrador" },
    { value: "PROF_COMP", label: "Professor de Computação" },
    { value: "PROF", label: "Professor" },
    { value: "FUNCIONARIO", label: "Funcionário" },
    { value: "ALUNO", label: "Aluno" },
];

type Notificacao = {
    type: "success" | "error" | "info";
    message: string;
};

export default function CadastrarUsuarioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [nome, setNome] = useState("");
    const [login, setLogin] = useState("");
    const [senha, setSenha] = useState("");
    const [grupo, setGrupo] = useState("ALUNO");
    const [showSenha, setShowSenha] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
    const [errors, setErrors] = useState<{ nome?: string; login?: string; senha?: string }>({});

    const router = useRouter();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const nomeRef = useRef<HTMLInputElement | null>(null);

    // CLASSE PADRÃO PARA TODOS INPUTS/SELECTS (GARANTE CONTRASTE)
    const INPUT_CLASS =
        "w-full px-4 py-2 border rounded-lg bg-white text-gray-900 placeholder-gray-500 border-gray-300 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition";

    useEffect(() => {
        if (!token) router.push("/login");
    }, [router, token]);

    useEffect(() => {
        nomeRef.current?.focus();
    }, []);

    const validate = () => {
        const e: typeof errors = {};
        if (!nome.trim()) e.nome = "Nome é obrigatório.";
        if (!login.trim()) e.login = "Login é obrigatório.";
        if (!senha) e.senha = "Senha é obrigatória.";
        else if (senha.length < 6) e.senha = "Senha precisa ter ao menos 6 caracteres.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const clearForm = () => {
        setNome("");
        setLogin("");
        setSenha("");
        setGrupo("ALUNO");
        setErrors({});
        setNotificacao(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotificacao(null);
        if (!token) {
            setNotificacao({ type: "error", message: "Autenticação necessária." });
            router.push("/login");
            return;
        }

        if (!validate()) return;
        setLoading(true);

        try {
            const res = await fetch(`http://localhost:8080/usuarios/cadastrar/${grupo}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ nome: nome.trim(), login: login.trim(), senha }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setNotificacao({ type: "success", message: "Usuário cadastrado com sucesso!" });

                if ((data as any).location) {
                    const id = String((data as any).location).split("/").pop();
                    if (id) {
                        router.push(`/usuarios/${id}`);
                        return;
                    }
                }
                clearForm();
            } else {
                const message = (data as any).mensagem || (data as any).message || "Erro ao cadastrar usuário.";
                setNotificacao({ type: "error", message });
            }
        } catch (err) {
            console.error(err);
            setNotificacao({ type: "error", message: "Falha de conexão com o servidor." });
        } finally {
            setLoading(false);
        }
    };

    const initials = (name: string) =>
        name
            .split(" ")
            .map((p) => p[0] ?? "")
            .slice(0, 2)
            .join("")
            .toUpperCase();

    return (
        <div className="flex min-h-screen font-sans bg-gradient-to-b from-gray-50 to-white">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <header className="p-4 bg-white md:hidden flex items-center shadow-sm sticky top-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Abrir menu"
                        className="text-blue-700 hover:text-blue-900 transition-colors"
                    >
                        ☰
                    </button>
                    <h1 className="ml-4 font-bold text-lg text-gray-700">Sistema de Reservas</h1>
                </header>

                <main className="flex-1 p-6 md:p-12 flex items-center justify-center">
                    <div className="w-full max-w-2xl">
                        <div className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-2xl p-6 md:p-8 shadow-lg mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold">
                                    ✨
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold">Cadastrar Usuário</h2>
                                    <p className="text-indigo-100/90 mt-1 text-sm">
                                        Preencha os dados para criar um novo usuário. Senha com ao menos 6 caracteres.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                            {/* Nome */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                    <input
                                        ref={nomeRef}
                                        value={nome}
                                        onChange={(ev) => setNome(ev.target.value)}
                                        type="text"
                                        placeholder="Ex.: Maria da Silva"
                                        aria-invalid={!!errors.nome}
                                        className={`${INPUT_CLASS} ${errors.nome ? "border-red-300 bg-red-50" : ""}`}
                                        autoComplete="name"
                                    />
                                    {errors.nome && <div className="text-sm text-red-600 mt-1">{errors.nome}</div>}
                                </div>

                                {/* Login */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                                    <input
                                        value={login}
                                        onChange={(ev) => setLogin(ev.target.value)}
                                        type="text"
                                        placeholder="Ex.: maria.silva"
                                        aria-invalid={!!errors.login}
                                        className={`${INPUT_CLASS} ${errors.login ? "border-red-300 bg-red-50" : ""}`}
                                        autoComplete="username"
                                    />
                                    {errors.login && <div className="text-sm text-red-600 mt-1">{errors.login}</div>}
                                </div>

                                {/* Senha */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                    <div className="relative">
                                        <input
                                            value={senha}
                                            onChange={(ev) => setSenha(ev.target.value)}
                                            type={showSenha ? "text" : "password"}
                                            placeholder="Digite uma senha segura"
                                            aria-invalid={!!errors.senha}
                                            className={`${INPUT_CLASS} ${errors.senha ? "border-red-300 bg-red-50" : ""}`}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSenha((s) => !s)}
                                            aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            {showSenha ? "Ocultar" : "Mostrar"}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="text-sm text-gray-500">
                                            Força: <strong className="text-gray-700">{senha.length >= 6 ? "Boa" : "Fraca"}</strong>
                                        </div>
                                        {errors.senha && <div className="text-sm text-red-600">{errors.senha}</div>}
                                    </div>
                                </div>

                                {/* Grupo */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {GRUPOS.map((g) => {
                                            const active = g.value === grupo;
                                            return (
                                                <button
                                                    key={g.value}
                                                    type="button"
                                                    onClick={() => setGrupo(g.value)}
                                                    className={`px-3 py-2 rounded-full text-sm font-medium transition ${active
                                                        ? "bg-indigo-600 text-white shadow-md"
                                                        : "bg-gray-100 text-gray-700 hover:shadow-sm"
                                                        }`}
                                                >
                                                    {g.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* select invisível só por acessibilidade/backup (opcional) */}
                                    <label className="sr-only">Grupo (backup)</label>
                                    <select
                                        value={grupo}
                                        onChange={(e) => setGrupo(e.target.value)}
                                        className={`${INPUT_CLASS} max-w-xs appearance-none`}
                                    >
                                        {GRUPOS.map((g) => (
                                            <option key={g.value} value={g.value}>
                                                {g.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 inline-flex items-center justify-center gap-3 px-4 py-2 rounded-lg text-white font-semibold transition transform ${loading ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:scale-[1.02]"
                                        }`}
                                >
                                    {loading && (
                                        <svg
                                            className="w-5 h-5 animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                            <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" className="opacity-75" />
                                        </svg>
                                    )}
                                    Cadastrar
                                </button>


                                <button
                                    type="button"
                                    onClick={clearForm}
                                    className="px-4 py-2 rounded-lg border border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200"
                                >
                                    Limpar
                                </button>
                            </div>

                            {notificacao && (
                                <div
                                    role="status"
                                    className={`mt-6 p-4 rounded-lg text-sm font-medium ${notificacao.type === "success"
                                        ? "bg-green-50 text-green-800"
                                        : notificacao.type === "error"
                                            ? "bg-red-50 text-red-800"
                                            : "bg-yellow-50 text-yellow-800"
                                        }`}
                                >
                                    {notificacao.message}
                                </div>
                            )}
                        </form>

                        {/* Preview */}
                        <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-semibold text-indigo-700">
                                {initials(nome || "Usu")}
                            </div>
                            <div>
                                <div className="font-medium text-gray-800">Pré-visualização</div>
                                <div className="text-gray-500">
                                    Nome: <span className="font-medium text-gray-700">{nome || "—"}</span> · Login:{" "}
                                    <span className="font-medium text-gray-700">{login || "—"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
