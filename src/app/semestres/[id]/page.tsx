"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

interface Semestre {
    id: string;
    ano: number;
    periodo: number;
    descricao: string;
    dataInicio: string;
    dataFim: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL // ✅ domínio centralizado


type Notificacao = { type: "success" | "error" | "info"; message: string } | null;

export default function SemestrePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [semestre, setSemestre] = useState<Semestre | null>(null);
    const [original, setOriginal] = useState<Semestre | null>(null);
    const [notificacao, setNotificacao] = useState<Notificacao>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editando, setEditando] = useState(false);

    const router = useRouter();
    const params = useParams();
    const id = (params as any)?.id as string | undefined;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const INPUT_CLASS =
        "w-full h-12 px-4 text-base rounded-lg border transition-all duration-300 focus:outline-none" +
        " bg-white border-gray-200 text-gray-800 placeholder-gray-400";

    useEffect(() => {
        if (!token) router.push("/login");
    }, [router, token]);

    useEffect(() => {
        if (!id || !token) return;
        let mounted = true;

        const fetchSemestre = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/semestre/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Erro ao buscar semestre");
                const data = await res.json();
                if (!mounted) return;
                setSemestre(data);
                setOriginal(data);
            } catch (err) {
                console.error(err);
                setNotificacao({ type: "error", message: "Falha ao carregar semestre." });
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchSemestre();
        return () => {
            mounted = false;
        };
    }, [id, token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!semestre) return;
        setSemestre({ ...semestre, [e.target.name]: e.target.value } as Semestre);
    };

    const validate = () => {
        if (!semestre) return false;
        if (!semestre.ano || semestre.ano <= 0) {
            setNotificacao({ type: "error", message: "Ano é obrigatório." });
            return false;
        }
        if (!semestre.periodo || semestre.periodo <= 0) {
            setNotificacao({ type: "error", message: "Período é obrigatório." });
            return false;
        }
        if (!semestre.descricao || !semestre.descricao.trim()) {
            setNotificacao({ type: "error", message: "Descrição é obrigatória." });
            return false;
        }
        if (!semestre.dataInicio || !semestre.dataFim) {
            setNotificacao({ type: "error", message: "Datas são obrigatórias." });
            return false;
        }
        return true;
    };

    const handleAtualizar = async () => {
        if (!semestre || !token) return;
        setNotificacao(null);
        if (!validate()) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/semestre/${semestre.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...semestre,
                    dataInicio: new Date(semestre.dataInicio).toISOString(),
                    dataFim: new Date(semestre.dataFim).toISOString(),
                }),
            });

            if (res.ok) {
                setNotificacao({ type: "success", message: "Semestre atualizado com sucesso!" });
                setEditando(false);
                setOriginal({ ...semestre });
            } else {
                const data = await res.json().catch(() => ({}));
                setNotificacao({
                    type: "error",
                    message: data.erro || data.mensagem || data.message || "Erro ao atualizar semestre.",
                });
            }
        } catch (err) {
            console.error(err);
            setNotificacao({ type: "error", message: "Falha na conexão com o servidor." });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelar = () => {
        if (original) setSemestre(original);
        setEditando(false);
        setNotificacao(null);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
                <div className="text-center p-8 bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl max-w-sm w-full mx-4 border border-white/20">
                    <div className="relative mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-violet-500 to-purple-600 animate-pulse"></div>
                        <div className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Carregando semestre</h2>
                    <p className="text-sm text-gray-600">Aguarde um momento...</p>
                </div>
            </div>
        );
    }

    if (!semestre) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-4">
                <div className="w-full max-w-md bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
                    <div className="p-8 text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Semestre não encontrado</h2>
                        <p className="text-gray-600 mb-4">Erro ao carregar os dados do semestre.</p>
                        <button
                            onClick={() => router.back()}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 text-gray-800">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <main className="flex-1 p-4 lg:p-8 xl:p-12">
                    <div className="max-w-4xl mx-auto space-y-8">

                        {/* Header */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {editando ? "Editar Semestre" : "Visualizar Semestre"}
                                </h1>
                                <p className="text-gray-700">
                                    ID: <span className="font-mono">{semestre.id}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setEditando(true); setNotificacao(null); }}
                                    className={`h-12 px-5 rounded-lg font-semibold shadow-lg transition transform ${!editando
                                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                                        : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    Liberar edição
                                </button>
                            </div>
                        </div>

                        {notificacao && (
                            <div
                                className={`p-4 rounded-lg border-l-4 shadow-lg ${notificacao.type === "success"
                                    ? "border-l-green-500 bg-green-50 text-green-800"
                                    : "border-l-red-500 bg-red-50 text-red-800"
                                    }`}
                            >
                                {notificacao.message}
                            </div>
                        )}

                        {/* Formulário */}
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl p-8 grid grid-cols-1 gap-6">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Ano</label>
                                <input
                                    type="number"
                                    name="ano"
                                    value={semestre.ano}
                                    onChange={handleChange}
                                    disabled={!editando}
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-100 text-gray-500" : ""}`}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700">Período</label>
                                <input
                                    type="number"
                                    name="periodo"
                                    value={semestre.periodo}
                                    onChange={handleChange}
                                    disabled={!editando}
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-100 text-gray-500" : ""}`}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700">Descrição</label>
                                <input
                                    type="text"
                                    name="descricao"
                                    maxLength={20}
                                    value={semestre.descricao}
                                    onChange={handleChange}
                                    disabled={!editando}
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-100 text-gray-500" : ""}`}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700">Data de Início</label>
                                <input
                                    type="date"
                                    name="dataInicio"
                                    value={semestre.dataInicio.slice(0, 10)}
                                    onChange={handleChange}
                                    disabled={!editando}
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-100 text-gray-500" : ""}`}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700">Data de Fim</label>
                                <input
                                    type="date"
                                    name="dataFim"
                                    value={semestre.dataFim.slice(0, 10)}
                                    onChange={handleChange}
                                    disabled={!editando}
                                    className={`${INPUT_CLASS} ${!editando ? "bg-gray-100 text-gray-500" : ""}`}
                                />
                            </div>

                            {editando && (
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={handleAtualizar}
                                        disabled={saving}
                                        className="bg-gradient-to-r from-violet-500 to-purple-600 text-white h-12 px-6 rounded-lg flex-1 font-semibold shadow-lg"
                                    >
                                        {saving ? "Salvando..." : "Salvar Alterações"}
                                    </button>
                                    <button
                                        onClick={handleCancelar}
                                        disabled={saving}
                                        className="border border-gray-300 text-gray-700 h-12 px-6 rounded-lg flex-1 font-semibold hover:bg-gray-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
