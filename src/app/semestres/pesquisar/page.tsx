// app/(seu-path)/semestres/pesquisar/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

interface Semestre {
    id: string;
    descricao: string;
    ano: number;
    periodo: number;
    dataInicio: string;
    dataFim: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL // ✅ domínio centralizado

export default function PesquisarSemestres() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [semestres, setSemestres] = useState<Semestre[]>([]);
    const [descricao, setDescricao] = useState("");
    const [ano, setAno] = useState<number | "">("");
    const [periodo, setPeriodo] = useState<number | "">("");
    const [notificacao, setNotificacao] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    useEffect(() => {
        if (!token) router.push("/login");
    }, [router, token]);

    const INPUT_CLASS =
        "w-full px-4 py-3 border rounded-lg bg-white text-gray-900 placeholder-gray-500 border-gray-200 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition text-sm sm:text-base";

    const handlePesquisar = async () => {
        if (!token) {
            setNotificacao("Você precisa estar autenticado.");
            return;
        }
        setLoading(true);
        setNotificacao(null);

        try {
            const params = new URLSearchParams();
            if (descricao) params.append("descricao", descricao);
            if (ano) params.append("ano", String(ano));
            if (periodo) params.append("periodo", String(periodo));

            const res = await fetch(`${API_URL}/semestre/pesquisar?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Erro ao buscar semestres");
            const data: Semestre[] = await res.json();
            setSemestres(data);
            if (data.length === 0) setNotificacao("Nenhum semestre encontrado com esse filtro.");
        } catch (err) {
            console.error(err);
            setNotificacao("Falha ao buscar semestres. Verifique o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setDescricao("");
        setAno("");
        setPeriodo("");
        setSemestres([]);
        setNotificacao(null);
    };

    return (
        <div className="flex min-h-screen font-sans bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            <div className="flex-1 flex flex-col min-h-screen">
                <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 text-white py-5 px-4 sm:px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden p-2 rounded-md bg-white/20 hover:bg-white/30 transition"
                            aria-label="Abrir menu"
                        >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Pesquisar Semestres</h1>
                            <p className="text-sm text-indigo-100">Busque por descrição, ano ou período</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                        <div className="text-xs text-indigo-100">Dica:</div>
                        <div className="px-3 py-2 rounded-full bg-white/10 text-sm">Use filtros para refinar resultados</div>
                    </div>
                </div>

                <main className="flex-1 p-4 sm:p-6 md:p-8 w-full">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Filtros */}
                        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-gray-100">
                            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                                    <input
                                        className={INPUT_CLASS}
                                        type="text"
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        placeholder="Pesquisar por descrição..."
                                    />
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
                                    <input
                                        className={INPUT_CLASS}
                                        type="number"
                                        value={ano}
                                        onChange={(e) => setAno(e.target.value ? Number(e.target.value) : "")}
                                        placeholder="Ano"
                                    />
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
                                    <input
                                        className={INPUT_CLASS}
                                        type="number"
                                        value={periodo}
                                        onChange={(e) => setPeriodo(e.target.value ? Number(e.target.value) : "")}
                                        placeholder="Período"
                                    />
                                </div>

                                <div className="flex gap-2 lg:gap-3">
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:shadow-sm transition"
                                    >
                                        Limpar
                                    </button>

                                    <button
                                        onClick={handlePesquisar}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold hover:from-indigo-700 hover:to-sky-600 transition shadow"
                                    >
                                        Pesquisar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Resultados */}
                        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Resultados</h2>
                                    <p className="text-sm text-gray-700">{semestres.length} semestre(s)</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {loading && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                                            Carregando...
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setSemestres([]);
                                            setNotificacao(null);
                                        }}
                                        className="hidden sm:inline-block px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:shadow-sm"
                                    >
                                        Limpar resultados
                                    </button>
                                </div>
                            </div>

                            {notificacao && <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm">{notificacao}</div>}

                            {loading ? (
                                <div className="py-8 text-center text-gray-400">Aguarde...</div>
                            ) : semestres.length === 0 ? (
                                <div className="py-10 text-center text-gray-400">
                                    <div className="mb-3 text-3xl">🔍</div>
                                    <div className="text-sm">Nenhum semestre encontrado.</div>
                                </div>
                            ) : (
                                <>
                                    {/* Tabela desktop */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="min-w-full table-fixed border-collapse">
                                            <thead>
                                                <tr className="text-sm text-gray-900 border-b">
                                                    <th className="py-3 px-4 text-left">Descrição</th>
                                                    <th className="py-3 px-4 text-left">Ano</th>
                                                    <th className="py-3 px-4 text-left">Período</th>
                                                    <th className="py-3 px-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {semestres.map((s) => (
                                                    <tr key={s.id} className="border-b hover:bg-gray-50 text-sm bg-white">
                                                        <td className="py-3 px-4 text-gray-900">{s.descricao}</td>
                                                        <td className="py-3 px-4 text-gray-900">{s.ano}</td>
                                                        <td className="py-3 px-4 text-gray-900">{s.periodo}</td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button
                                                                onClick={() => router.push(`/semestres/${s.id}`)}
                                                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs hover:from-emerald-600 hover:to-emerald-700 transition-shadow shadow-sm"
                                                            >
                                                                Visualizar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Cards mobile */}
                                    <div className="lg:hidden space-y-3">
                                        {semestres.map((s) => (
                                            <div key={s.id} className="border rounded-xl p-4 shadow-sm bg-white">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{s.descricao}</div>
                                                        <div className="text-sm text-gray-700">
                                                            Ano: {s.ano} | Período: {s.periodo} | ID: {s.id}
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <button
                                                            onClick={() => router.push(`/semestres/${s.id}`)}
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition"
                                                        >
                                                            Ver
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
