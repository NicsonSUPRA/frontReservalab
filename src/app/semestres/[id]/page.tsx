"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

interface Semestre {
    id: string;
    ano: number;
    periodo: number;
    descricao: string;
    dataInicio: string;
    dataFim: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Notificacao = { type: "success" | "error" | "info"; message: string } | null;

// Função para pegar a role do usuário
function getUserRole(): string | null {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return null;
    try {
        const base64 = token.split(".")[1];
        const decoded = JSON.parse(atob(base64));
        if (decoded?.roles && Array.isArray(decoded.roles)) {
            return decoded.roles[0]; // pega a primeira role
        }
        return null;
    } catch (e) {
        return null;
    }
}

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

    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) router.push("/login");
    }, [router]);

    const isAdmin = userRole === "ADMIN";

    const INPUT_CLASS =
        "w-full h-12 px-4 text-base rounded-lg border transition-all duration-300 focus:outline-none bg-white border-gray-200 text-gray-800 placeholder-gray-400";

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
        return () => { mounted = false; };
    }, [id]);

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
        if (!semestre) return;
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return;

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
                setNotificacao({ type: "error", message: data.erro || data.mensagem || data.message || "Erro ao atualizar semestre." });
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

    if (loading) return <div>Carregando...</div>;
    if (!semestre) return <div>Semestre não encontrado</div>;

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 text-gray-800">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col min-h-screen">
                <Header titulo={editando ? "Editar Semestre" : "Visualizar Semestre"} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 p-4 lg:p-8 xl:p-12">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl font-bold text-gray-900">{editando ? "Editar Semestre" : "Visualizar Semestre"}</h1>
                                <p className="text-gray-700">ID: <span className="font-mono">{semestre.id}</span></p>
                            </div>

                            {isAdmin && (
                                <div>
                                    <button
                                        onClick={() => { setEditando(true); setNotificacao(null); }}
                                        className={`h-12 px-5 rounded-lg font-semibold shadow-lg transition transform ${!editando ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700" : "bg-gray-100 text-gray-700"}`}
                                    >
                                        Liberar edição
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Form */}
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl p-8 grid grid-cols-1 gap-6">
                            <div>
                                <label>Ano</label>
                                <input type="number" name="ano" value={semestre.ano} onChange={handleChange} disabled={!editando || !isAdmin} className={INPUT_CLASS} />
                            </div>
                            <div>
                                <label>Período</label>
                                <input type="number" name="periodo" value={semestre.periodo} onChange={handleChange} disabled={!editando || !isAdmin} className={INPUT_CLASS} />
                            </div>
                            <div>
                                <label>Descrição</label>
                                <input type="text" name="descricao" maxLength={20} value={semestre.descricao} onChange={handleChange} disabled={!editando || !isAdmin} className={INPUT_CLASS} />
                            </div>
                            <div>
                                <label>Data Início</label>
                                <input type="date" name="dataInicio" value={semestre.dataInicio.slice(0, 10)} onChange={handleChange} disabled={!editando || !isAdmin} className={INPUT_CLASS} />
                            </div>
                            <div>
                                <label>Data Fim</label>
                                <input type="date" name="dataFim" value={semestre.dataFim.slice(0, 10)} onChange={handleChange} disabled={!editando || !isAdmin} className={INPUT_CLASS} />
                            </div>

                            {editando && isAdmin && (
                                <div className="flex gap-4 pt-4">
                                    <button onClick={handleAtualizar} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white h-12 px-6 rounded-lg flex-1 font-semibold shadow-lg">
                                        Salvar Alterações
                                    </button>
                                    <button onClick={handleCancelar} className="border border-gray-300 text-gray-700 h-12 px-6 rounded-lg flex-1 font-semibold hover:bg-gray-50 transition-all">
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
