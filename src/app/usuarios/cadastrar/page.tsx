"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

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

type Disciplina = {
    nome: string;
    descricao: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function CadastrarUsuarioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [nome, setNome] = useState("");
    const [login, setLogin] = useState("");
    const [senha, setSenha] = useState("");
    const [email, setEmail] = useState(""); // ✅ novo estado
    const [grupo, setGrupo] = useState("ALUNO");
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]); // ✅ lista de disciplinas
    const [showSenha, setShowSenha] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
    const [errors, setErrors] = useState<{ nome?: string; login?: string; senha?: string; email?: string }>({});

    const router = useRouter();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const nomeRef = useRef<HTMLInputElement | null>(null);

    const INPUT_CLASS =
        "w-full px-4 py-2 border rounded-lg bg-white text-gray-900 placeholder-gray-500 border-gray-300 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition";

    useEffect(() => {
        if (!token) router.push("/login");
    }, [router, token]);

    useEffect(() => {
        nomeRef.current?.focus();
    }, []);

    const isProfessorRole = (r: string) => r === "PROF" || r === "PROF_COMP";

    const validate = () => {
        const e: typeof errors = {};
        if (!nome.trim()) e.nome = "Nome é obrigatório.";
        if (!login.trim()) e.login = "Login é obrigatório.";
        if (!email.trim()) e.email = "E-mail é obrigatório.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido.";
        if (!senha) e.senha = "Senha é obrigatória.";
        else if (senha.length < 6) e.senha = "Senha precisa ter ao menos 6 caracteres.";

        // validações simples para disciplinas quando for professor
        if (isProfessorRole(grupo)) {
            // se houver disciplinas, garantir nome não vazio
            for (let i = 0; i < disciplinas.length; i++) {
                const d = disciplinas[i];
                if (!d.nome || !d.nome.trim()) {
                    e.nome = `Nome da disciplina #${i + 1} é obrigatório.`;
                    break;
                }
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const clearForm = () => {
        setNome("");
        setLogin("");
        setSenha("");
        setEmail("");
        setGrupo("ALUNO");
        setDisciplinas([]);
        setErrors({});
        setNotificacao(null);
    };

    const adicionarDisciplina = () => {
        setDisciplinas((prev) => [...prev, { nome: "", descricao: "" }]);
    };

    const removerDisciplina = (index: number) => {
        setDisciplinas((prev) => prev.filter((_, i) => i !== index));
    };

    const atualizarDisciplina = (index: number, campo: keyof Disciplina, valor: string) => {
        setDisciplinas((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [campo]: valor };
            return copy;
        });
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
            const payload: any = {
                nome: nome.trim(),
                login: login.trim(),
                senha,
                email: email.trim(),
            };

            // só enviar disciplinas se a role for professor/prof_comp e houver disciplinas
            if (isProfessorRole(grupo) && disciplinas.length > 0) {
                payload.disciplinas = disciplinas.map((d) => ({
                    nome: d.nome.trim(),
                    descricao: d.descricao?.trim(),
                }));
            }

            // 🔍 Exibe no console o curl equivalente
            const curlCommand = `
    curl -X POST "${API_URL}/usuarios/cadastrar/${grupo}" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer ${token}" \\
    -d '${JSON.stringify(payload, null, 2)}'
            `.trim();

            console.log("🔍 CURL equivalente:\n" + curlCommand);

            const res = await fetch(`${API_URL}/usuarios/cadastrar/${grupo}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
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
                <Header titulo="Cadastrar Usuário" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                <main className="flex-1 p-6 md:p-12 flex items-center justify-center">
                    <div className="w-full max-w-2xl">
                        {/* <div className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-2xl p-6 md:p-8 shadow-lg mb-6">
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
                        </div> */}

                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                            {/* Nome / Login / Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nome */}
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

                                {/* Email */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                    <input
                                        value={email}
                                        onChange={(ev) => setEmail(ev.target.value)}
                                        type="email"
                                        placeholder="Ex.: maria.silva@exemplo.com"
                                        aria-invalid={!!errors.email}
                                        className={`${INPUT_CLASS} ${errors.email ? "border-red-300 bg-red-50" : ""}`}
                                        autoComplete="email"
                                    />
                                    {errors.email && <div className="text-sm text-red-600 mt-1">{errors.email}</div>}
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
                                </div>
                            </div>

                            {/* Disciplinas - renderiza apenas para PROF ou PROF_COMP */}
                            {isProfessorRole(grupo) && (
                                <div className="mt-4 border-t pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-base font-semibold text-gray-700">Disciplinas</h3>
                                        <button
                                            type="button"
                                            onClick={adicionarDisciplina}
                                            className="px-3 py-1 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
                                        >
                                            Adicionar disciplina
                                        </button>
                                    </div>

                                    {disciplinas.length === 0 && (
                                        <div className="text-sm text-gray-500 mb-3">Nenhuma disciplina adicionada.</div>
                                    )}

                                    <div className="space-y-3">
                                        {disciplinas.map((disc, idx) => (
                                            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                                <div className="md:col-span-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                                    <input
                                                        type="text"
                                                        value={disc.nome}
                                                        onChange={(e) => atualizarDisciplina(idx, "nome", e.target.value)}
                                                        placeholder="Nome da disciplina"
                                                        className={`${INPUT_CLASS}`}
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                                    <input
                                                        type="text"
                                                        value={disc.descricao}
                                                        onChange={(e) => atualizarDisciplina(idx, "descricao", e.target.value)}
                                                        placeholder="Breve descrição"
                                                        className={`${INPUT_CLASS}`}
                                                    />
                                                </div>
                                                <div className="md:col-span-1 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => removerDisciplina(idx)}
                                                        className="px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                        <div className="mt-6 flex items-start gap-4 text-sm text-gray-500">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-semibold text-indigo-700">
                                {initials(nome || "Usu")}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-gray-800">Pré-visualização</div>
                                <div className="text-gray-500">
                                    Nome: <span className="font-medium text-gray-700">{nome || "—"}</span> · Login:{" "}
                                    <span className="font-medium text-gray-700">{login || "—"}</span> · E-mail:{" "}
                                    <span className="font-medium text-gray-700">{email || "—"}</span>
                                </div>

                                {isProfessorRole(grupo) && disciplinas.length > 0 && (
                                    <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="text-sm text-gray-600 font-medium mb-2">Disciplinas adicionadas:</div>
                                        <ul className="text-gray-700 list-disc list-inside space-y-1">
                                            {disciplinas.map((d, i) => (
                                                <li key={i}>
                                                    <span className="font-medium">{d.nome}</span>
                                                    {d.descricao && <span className="text-gray-500"> — {d.descricao}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
