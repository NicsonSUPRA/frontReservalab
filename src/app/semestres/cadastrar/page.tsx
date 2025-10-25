"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

type Notificacao = {
    type: "success" | "error" | "info";
    message: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL // ✅ domínio centralizado

export default function CadastrarSemestrePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [ano, setAno] = useState("");
    const [periodo, setPeriodo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");

    const [loading, setLoading] = useState(false);
    const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
    const [errors, setErrors] = useState<{
        ano?: string;
        periodo?: string;
        descricao?: string;
        dataInicio?: string;
        dataFim?: string;
    }>({});

    const router = useRouter();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const anoRef = useRef<HTMLInputElement | null>(null);

    const INPUT_CLASS =
        "w-full px-4 py-2 border rounded-lg bg-white text-gray-900 placeholder-gray-500 border-gray-300 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition";

    useEffect(() => {
        if (!token) router.push("/login");
    }, [router, token]);

    useEffect(() => {
        anoRef.current?.focus();
    }, []);

    const validate = () => {
        const e: typeof errors = {};
        if (!ano.trim()) e.ano = "Ano é obrigatório.";
        if (!periodo.trim()) e.periodo = "Período é obrigatório.";
        if (!descricao.trim()) e.descricao = "Descrição é obrigatória.";
        if (!dataInicio.trim()) e.dataInicio = "Data de início é obrigatória.";
        if (!dataFim.trim()) e.dataFim = "Data de fim é obrigatória.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const clearForm = () => {
        setAno("");
        setPeriodo("");
        setDescricao("");
        setDataInicio("");
        setDataFim("");
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
            // Transformar data para ISO com hora 00:00
            const formatDate = (date: string) => new Date(`${date}T00:00:00`).toISOString();

            const res = await fetch(`${API_URL}/semestre`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ano: parseInt(ano),
                    periodo: parseInt(periodo),
                    descricao: descricao.trim(),
                    dataInicio: formatDate(dataInicio),
                    dataFim: formatDate(dataFim),
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const location = (data as any).location;
                let newId: string | undefined;

                if (location) {
                    const parts = location.split("/");
                    newId = parts[parts.length - 1]; // último segmento da URL
                }

                setNotificacao({ type: "success", message: "Semestre cadastrado com sucesso!" });

                if (newId) {
                    router.push(`/semestres/${newId}`);
                }
            } else {
                const message =
                    (data as any).mensagem || (data as any).message || "Erro ao cadastrar semestre.";
                setNotificacao({ type: "error", message });
            }
        } catch (err) {
            console.error(err);
            setNotificacao({ type: "error", message: "Falha de conexão com o servidor." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen font-sans bg-gradient-to-b from-gray-50 to-white">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <Header titulo="Cadastrar Semestre" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                {/* <header className="p-4 bg-white md:hidden flex items-center shadow-sm sticky top-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Abrir menu"
                        className="text-blue-700 hover:text-blue-900 transition-colors"
                    >
                        ☰
                    </button>
                    <h1 className="ml-4 font-bold text-lg text-gray-700">Sistema de Reservas</h1>
                </header> */}

                <main className="flex-1 p-6 md:p-12 flex items-center justify-center">
                    <div className="w-full max-w-2xl">
                        {/* <div className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-2xl p-6 md:p-8 shadow-lg mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold">
                                    📅
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold">Cadastrar Semestre</h2>
                                    <p className="text-indigo-100/90 mt-1 text-sm">
                                        Preencha os dados abaixo para cadastrar um semestre.
                                    </p>
                                </div>
                            </div>
                        </div> */}

                        <form
                            onSubmit={handleSubmit}
                            className="bg-white rounded-2xl shadow-xl p-6 md:p-8 grid grid-cols-1 gap-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ano
                                </label>
                                <input
                                    ref={anoRef}
                                    value={ano}
                                    onChange={(ev) => setAno(ev.target.value)}
                                    type="number"
                                    placeholder="Ex.: 2025"
                                    className={`${INPUT_CLASS} ${errors.ano ? "border-red-300 bg-red-50" : ""
                                        }`}
                                />
                                {errors.ano && (
                                    <div className="text-sm text-red-600 mt-1">{errors.ano}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Período
                                </label>
                                <input
                                    value={periodo}
                                    onChange={(ev) => setPeriodo(ev.target.value)}
                                    type="number"
                                    placeholder="Ex.: 1"
                                    className={`${INPUT_CLASS} ${errors.periodo ? "border-red-300 bg-red-50" : ""
                                        }`}
                                />
                                {errors.periodo && (
                                    <div className="text-sm text-red-600 mt-1">{errors.periodo}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descrição
                                </label>
                                <input
                                    value={descricao}
                                    onChange={(ev) => setDescricao(ev.target.value)}
                                    type="text"
                                    placeholder="Ex.: Semestre letivo 2025.1"
                                    maxLength={20}
                                    className={`${INPUT_CLASS} ${errors.descricao ? "border-red-300 bg-red-50" : ""
                                        }`}
                                />
                                {errors.descricao && (
                                    <div className="text-sm text-red-600 mt-1">
                                        {errors.descricao}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data de Início
                                </label>
                                <input
                                    value={dataInicio}
                                    onChange={(ev) => setDataInicio(ev.target.value)}
                                    type="date"
                                    className={`${INPUT_CLASS} ${errors.dataInicio ? "border-red-300 bg-red-50" : ""
                                        }`}
                                />
                                {errors.dataInicio && (
                                    <div className="text-sm text-red-600 mt-1">
                                        {errors.dataInicio}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data de Fim
                                </label>
                                <input
                                    value={dataFim}
                                    onChange={(ev) => setDataFim(ev.target.value)}
                                    type="date"
                                    className={`${INPUT_CLASS} ${errors.dataFim ? "border-red-300 bg-red-50" : ""
                                        }`}
                                />
                                {errors.dataFim && (
                                    <div className="text-sm text-red-600 mt-1">{errors.dataFim}</div>
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 inline-flex items-center justify-center gap-3 px-4 py-2 rounded-lg text-white font-semibold transition transform ${loading
                                        ? "bg-indigo-400 cursor-wait"
                                        : "bg-indigo-600 hover:scale-[1.02]"
                                        } `}
                                >
                                    {loading && (
                                        <svg
                                            className="w-5 h-5 animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                className="opacity-25"
                                            />
                                            <path
                                                d="M22 12a10 10 0 00-10-10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                className="opacity-75"
                                            />
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
                                        : "bg-red-50 text-red-800"
                                        }`}
                                >
                                    {notificacao.message}
                                </div>
                            )}
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
