"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

type Notificacao = {
    type: "success" | "error" | "info";
    message: string;
};

export default function CadastrarLaboratorioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [nome, setNome] = useState("");
    const [loading, setLoading] = useState(false);
    const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
    const [errors, setErrors] = useState<{ nome?: string }>({});

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

    const validate = () => {
        const e: typeof errors = {};
        if (!nome.trim()) e.nome = "Nome é obrigatório.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const clearForm = () => {
        setNome("");
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
            const res = await fetch(`http://localhost:8080/laboratorios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ nome: nome.trim() }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const location = (data as any).location as string | undefined;
                if (location) {
                    const id = location.split("/").pop();
                    if (id) {
                        router.push(`/laboratorios/${id}`);
                        return;
                    }
                }
                setNotificacao({ type: "success", message: "Laboratório cadastrado, mas não foi possível redirecionar." });
                clearForm();
            } else {
                const message = (data as any).mensagem || (data as any).message || "Erro ao cadastrar laboratório.";
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
                                    💻
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold">Cadastrar Laboratório</h2>
                                    <p className="text-indigo-100/90 mt-1 text-sm">
                                        Preencha o nome do laboratório.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                    <input
                                        ref={nomeRef}
                                        value={nome}
                                        onChange={(ev) => setNome(ev.target.value)}
                                        type="text"
                                        placeholder="Ex.: Laboratório de Redes"
                                        aria-invalid={!!errors.nome}
                                        className={`${INPUT_CLASS} ${errors.nome ? "border-red-300 bg-red-50" : ""}`}
                                        autoComplete="off"
                                    />
                                    {errors.nome && <div className="text-sm text-red-600 mt-1">{errors.nome}</div>}
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 inline-flex items-center justify-center gap-3 px-4 py-2 rounded-lg text-white font-semibold transition transform ${loading ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:scale-[1.02]"} `}
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
                                    className={`mt-6 p-4 rounded-lg text-sm font-medium ${notificacao.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                                >
                                    {notificacao.message}
                                </div>
                            )}
                        </form>

                        <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-semibold text-indigo-700">
                                {initials(nome || "Lab")}
                            </div>
                            <div>
                                <div className="font-medium text-gray-800">Pré-visualização</div>
                                <div className="text-gray-500">
                                    Nome: <span className="font-medium text-gray-700">{nome || "—"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
